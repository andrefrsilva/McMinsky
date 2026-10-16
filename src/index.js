// Worker do mcminsky.pt: serve o site publico e o sistema de cartoes pessoais.
//
// Tudo o que nao for uma rota daqui cai nos ficheiros estaticos montados em dist/ pelo
// tools/build.mjs. O site continua a ser exactamente o que era no GitHub Pages.
//
// Rotas proprias:
//   GET  /c                      formulario manual (para quem nao confia em QR codes)
//   GET  /c/<P>.<A>.<O>.<KK>     o cartao, com os tres tags e o verificador
//   GET  /api/cartao/<...>       o mesmo em JSON, para o front end
//   GET  /painel*                back office (protegido)
//
// Os caminhos aceitam maiusculas, porque o QR escreve o endereco TODO em maiusculas: o QR tem um
// modo de codificacao proprio, mais denso, so para maiusculas e digitos, e isso da um codigo mais
// pequeno e com mais correccao de erro ao mesmo tempo. O browser trata o dominio, o caminho e
// nosso.

import { criarFicha, lerFicha, aparelhoValido } from './ficha.js';
import { encaminhar as encaminharVoz } from './voz.js';
import { encaminhar as encaminharPainel } from './painel.js';

const ORIGENS = { Q: 'qr', M: 'manual', L: 'link' };

// Tecto diario de linhas em cru por cartao. Passado o tecto a visita continua a ser servida e
// continua a contar no agregado, mas deixa de gravar linha em cru. Ver o comentario da migracao:
// o tecto do D1 que bloqueia e o das escritas e e PARTILHADO com o Pessoas e o Tempo.
const TECTO_ESCRITAS_DIA = 300;

const ROBOS = /bot|crawler|spider|preview|facebookexternalhit|whatsapp|telegrambot|slackbot|discordbot|twitterbot|linkedinbot|embedly|quora link preview|pinterest|vkshare|skypeuripreview|googlebot|bingbot|applebot|headlesschrome|python-requests|curl\/|wget/i;

function hoje() {
  // Dia civil em Portugal. O agregado e por dia visto por ele, nao por dia UTC.
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' });
}

function dispositivoDe(req) {
  const movel = req.headers.get('sec-ch-ua-mobile');
  if (movel === '?1') return 'telefone';
  const ua = req.headers.get('user-agent') || '';
  if (/ipad|tablet/i.test(ua)) return 'tablet';
  if (/android|iphone|ipod|mobile/i.test(ua)) return 'telefone';
  if (movel === '?0' || /windows|macintosh|x11|linux/i.test(ua)) return 'computador';
  return 'desconhecido';
}

function eRobo(req) {
  const ua = req.headers.get('user-agent') || '';
  if (!ua) return true;
  if (ROBOS.test(ua)) return true;
  // Um pedido de pre-carregamento nao e uma pessoa a ler o cartao.
  const fim = (req.headers.get('sec-purpose') || req.headers.get('purpose') || '').toLowerCase();
  return fim.includes('prefetch') || fim.includes('preview');
}

// Alfabeto sem caracteres confundiveis a olho (sem I, O, 0, 1) e todo dentro do modo denso do QR.
const ALFABETO = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

// Duas letras de verificacao a partir do par e de um segredo nosso. Duas letras dao 1 em 1.024, e
// MEDIDO a 16 Out 2026: passar de uma para duas letras nao aumenta o tamanho do QR, logo e de graca.
// Serve para que escrever /C/1.1, /C/1.2, ... nao de cartoes validos: sem isto, qualquer um suja as
// estatisticas e, pior, gasta o orcamento de escritas da conta.
async function verificador(dono, afiliado, segredo) {
  const chave = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const assinatura = new Uint8Array(
    await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(`${dono}.${afiliado}`)),
  );
  return ALFABETO[assinatura[0] % 32] + ALFABETO[assinatura[1] % 32];
}

// /c/<P>.<A>.<O>.<KK> e tambem /c/<P>.<A> para links sem origem nem verificador.
function lerCaminho(pathname) {
  const m = /^\/c\/([^/]+)\/?$/i.exec(pathname);
  if (!m) return null;
  const partes = decodeURIComponent(m[1]).split('.');
  if (partes.length < 2) return null;
  const dono = Number(partes[0]);
  const afiliado = Number(partes[1]);
  if (!Number.isInteger(dono) || !Number.isInteger(afiliado) || dono < 1 || afiliado < 1) return null;
  const tagOrigem = (partes[2] || '').toUpperCase();
  return {
    dono,
    afiliado,
    origem: ORIGENS[tagOrigem] || 'desconhecida',
    verificador: (partes[3] || '').toUpperCase(),
  };
}

// Grava a visita. O agregado e escrito SEMPRE (e uma linha pequena e e o que o painel le); a linha
// em cru so e escrita abaixo do tecto do dia. Tudo numa so chamada a base.
async function registarVisita(env, dados) {
  const dia = hoje();
  const chaveAfiliado = dados.afiliado ?? 0;
  const comandos = [];

  const travao = await env.DB.prepare(
    'SELECT escritas FROM travao_dia WHERE dia = ? AND dono_num = ? AND afiliado_num = ?',
  ).bind(dia, dados.dono, chaveAfiliado).first();
  const jaEscritas = travao?.escritas ?? 0;
  const podeGravarCru = jaEscritas < TECTO_ESCRITAS_DIA;

  if (podeGravarCru) {
    comandos.push(
      env.DB.prepare(
        `INSERT INTO visitas (ts, dono_num, afiliado_num, origem, dispositivo, pais, robo, visitante)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      ).bind(
        Math.floor(Date.now() / 1000), dados.dono, dados.afiliado, dados.origem,
        dados.dispositivo, dados.pais, dados.robo ? 1 : 0, dados.visitante,
      ),
      env.DB.prepare(
        `INSERT INTO travao_dia (dia, dono_num, afiliado_num, escritas) VALUES (?, ?, ?, 1)
         ON CONFLICT(dia, dono_num, afiliado_num) DO UPDATE SET escritas = escritas + 1`,
      ).bind(dia, dados.dono, chaveAfiliado),
    );
  }

  comandos.push(
    env.DB.prepare(
      `INSERT INTO agregado_dia (dia, dono_num, afiliado_num, visitas, visitas_robo)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(dia, dono_num, afiliado_num) DO UPDATE SET
         visitas = visitas + excluded.visitas,
         visitas_robo = visitas_robo + excluded.visitas_robo`,
    ).bind(dia, dados.dono, chaveAfiliado, dados.robo ? 0 : 1, dados.robo ? 1 : 0),
  );

  const saida = await env.DB.batch(comandos);
  // O id da linha em cru serve para a pagina, depois de a pessoa aceitar, dizer QUAL a visita a
  // que pertence o codigo do aparelho. Sem ele so se podia adivinhar pela mais recente, e duas
  // pessoas a abrir o mesmo cartao ao mesmo tempo trocavam de lugar.
  const visita = podeGravarCru ? (saida?.[0]?.results?.[0]?.id ?? null) : null;
  return { gravou_cru: podeGravarCru, visita, escritas_hoje: jaEscritas + (podeGravarCru ? 1 : 0) };
}

function paginaSimples(titulo, corpo, estado = 200) {
  return new Response(
    `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo}</title>
<link rel="stylesheet" href="/css/styles.css">
<style>
  body { background:#0b0b0b; color:#f2f2f2; font-family:'Inter',system-ui,sans-serif;
         display:flex; min-height:100vh; align-items:center; justify-content:center; padding:24px; }
  main { max-width:32rem; }
  h1 { font-family:'Cormorant Garamond',serif; font-weight:400; font-size:2rem; margin-bottom:1rem; }
  p { line-height:1.6; color:#cfcfcf; }
  a { color:#f2f2f2; }
</style></head><body><main>${corpo}</main></body></html>`,
    { status: estado, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  );
}

// ---------------------------------------------------------------------------
// A porta do painel
//
// Uma palavra-passe num segredo do Worker, e um bolo assinado por nos. Nao ha base de utilizadores
// porque nao e preciso: quem entra aqui somos nos. O bolo leva a validade LA DENTRO e assinada, para
// nao poder ser esticado do lado do browser.

const DURACAO_SESSAO = 12 * 60 * 60 * 1000; // 12 horas

function paraBase64Url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function assinar(texto, segredo) {
  const chave = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return paraBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(texto))));
}

async function fazerBolo(segredo) {
  const expira = Date.now() + DURACAO_SESSAO;
  return `${expira}.${await assinar(String(expira), segredo)}`;
}

async function boloValido(valor, segredo) {
  if (!valor) return false;
  const [expira, assinatura] = valor.split('.');
  if (!expira || !assinatura) return false;
  if (Number(expira) < Date.now()) return false;
  // Comparacao em tempo constante nao e critica aqui (o segredo nao se descobre por tempo de
  // resposta de um HMAC completo), mas nao custa nada fazer o minimo decente.
  const esperado = await assinar(expira, segredo);
  if (esperado.length !== assinatura.length) return false;
  let igual = 0;
  for (let i = 0; i < esperado.length; i++) igual |= esperado.charCodeAt(i) ^ assinatura.charCodeAt(i);
  return igual === 0;
}

function lerBolo(req, nome) {
  const bruto = req.headers.get('cookie') || '';
  for (const parte of bruto.split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nome) return decodeURIComponent(v.join('='));
  }
  return null;
}

function formularioEntrada(erro) {
  return paginaSimples(
    'Painel',
    `<h1>Painel</h1>
     ${erro ? `<p style="color:#e88">${erro}</p>` : ''}
     <form method="POST" action="/painel/entrar">
       <p><input type="password" name="senha" placeholder="palavra-passe" autofocus
          style="padding:0.6rem;width:100%;max-width:18rem;font-size:1rem"></p>
       <p><button type="submit" style="padding:0.6rem 1.2rem;font-size:1rem;cursor:pointer">Entrar</button></p>
     </form>`,
    erro ? 401 : 200,
  );
}

// ---------------------------------------------------------------------------
// Reservar um bloco de numeros de afiliado
//
// O gerador NUNCA escolhe numeros. Pede aqui, e a base e que decide qual e o proximo. Sem isto, duas
// folhas impressas em dias diferentes podiam repetir numeros, e dois cartoes em plastico apontariam
// para a mesma pessoa para sempre. Ordem dele a 16 Out 2026: "se gerar novas folhas ele tem de ir
// ver quais os numeros de afiliados já usados".
async function reservarBloco(env, donoNum, quantos) {
  const dono = await env.DB.prepare('SELECT num, nome FROM donos WHERE num = ? AND activo = 1')
    .bind(donoNum).first();
  if (!dono) return { ok: false, erro: 'dono de cartao desconhecido' };

  const topo = await env.DB.prepare('SELECT COALESCE(MAX(num), 0) AS m FROM afiliados').first();
  const de = (topo?.m ?? 0) + 1;
  const ate = de + quantos - 1;
  const agora = Math.floor(Date.now() / 1000);

  const lote = await env.DB.prepare(
    'INSERT INTO lotes (dono_num, de, ate, quantos, criado_em) VALUES (?, ?, ?, ?, ?) RETURNING id',
  ).bind(donoNum, de, ate, quantos, agora).first();

  const insercoes = [];
  for (let n = de; n <= ate; n++) {
    insercoes.push(env.DB.prepare(
      'INSERT INTO afiliados (num, lote_id, criado_em) VALUES (?, ?, ?)',
    ).bind(n, lote.id, agora));
  }
  await env.DB.batch(insercoes);

  const segredo = env.SEGREDO_CARTOES;
  const cartoes = [];
  for (let n = de; n <= ate; n++) {
    const kk = await verificador(donoNum, n, segredo);
    cartoes.push({
      dono: donoNum,
      afiliado: n,
      // MAIUSCULAS de proposito: ver o comentario do verificador e o do gerador.
      url_qr: `HTTPS://MCMINSKY.PT/C/${donoNum}.${n}.Q.${kk}`,
    });
  }
  return { ok: true, lote: lote.id, de, ate, cartoes };
}

// ---------------------------------------------------------------------------
// A pagina do cartao
//
// Os dados vao DENTRO do HTML, no lugar da marca __DADOS__, em vez de a pagina os ir buscar a
// seguir. Tres razoes, por ordem de peso: aparece de uma vez so, sem o salto de uma pagina vazia
// que se preenche; continua a aparecer quando nao ha rede, porque a copia guardada ja traz tudo; e
// poupa uma ida ao servidor por cada abertura.

function escaparParaScript(texto) {
  // Fechar uma etiqueta de script dentro de uma cadeia de caracteres terminava o bloco no browser.
  return texto.replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

async function selo(valor, segredo) {
  return (await assinar(`v${valor}`, segredo)).slice(0, 16);
}

async function servirCartao(req, env, pedido, dono) {
  const segredo = env.SEGREDO_CARTOES;

  const perfil = await env.DB.prepare(
    `SELECT nome, papel, bio, foto_chave, linkedin, morada, mapa_url, email, whatsapp, telegram,
            telefone, gemeo_activo, gemeo_nome, gemeo_nota, gemeo_voz
       FROM perfis WHERE dono_num = ?`,
  ).bind(pedido.dono).first();

  // Esperar pelo registo custa poucos milissegundos e paga-se: e o que permite ligar o codigo do
  // aparelho a ESTA visita e nao a uma qualquer.
  let registo = { visita: null };
  try {
    registo = await registarVisita(env, {
      dono: pedido.dono,
      afiliado: pedido.afiliado,
      origem: pedido.origem,
      dispositivo: dispositivoDe(req),
      pais: req.cf?.country ?? null,
      robo: eRobo(req),
      visitante: null, // so depois de a pessoa aceitar
    });
  } catch (e) {
    // Um cartao que nao abre porque a estatistica falhou seria o pior erro possivel aqui.
  }

  const dados = {
    ficha: await criarFicha(pedido.dono, pedido.afiliado, segredo),
    cartao: { p: pedido.dono, a: pedido.afiliado, origem: pedido.origem },
    dono: { num: dono.num, nome: dono.nome, tipo: dono.tipo || 'pessoa' },
    perfil: {
      nome: perfil?.nome || dono.nome,
      papel: perfil?.papel || null,
      bio: perfil?.bio || null,
      foto: perfil?.foto_chave ? `/api/foto?c=${encodeURIComponent(perfil.foto_chave)}` : null,
      linkedin: perfil?.linkedin || null,
      morada: perfil?.morada || null,
      mapa: perfil?.mapa_url || null,
      email: perfil?.email || null,
      whatsapp: perfil?.whatsapp || null,
      telegram: perfil?.telegram || null,
      telefone: perfil?.telefone || null,
      gemeo_activo: perfil ? !!perfil.gemeo_activo : false,
      gemeo_nome: perfil?.gemeo_nome || null,
      gemeo_nota: perfil?.gemeo_nota || null,
    },
  };
  if (registo.visita) {
    dados.visita = `${registo.visita}.${await selo(registo.visita, segredo)}`;
  }

  const u = new URL(req.url);
  u.pathname = '/cartao/index.html';
  u.search = '';
  const pagina = await env.ASSETS.fetch(new Request(u.toString()));
  if (!pagina.ok) {
    return paginaSimples(dono.nome, `<h1>${dono.nome}</h1><p>O cartão está a funcionar.</p>`);
  }
  const html = (await pagina.text()).replace('__DADOS__', escaparParaScript(JSON.stringify(dados)));
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'x-content-type-options': 'nosniff',
    },
  });
}

// O codigo do aparelho chega DEPOIS da pagina, porque so existe depois de a pessoa aceitar. Esta
// rota liga-o a visita que ja foi gravada, e conta o aparelho como distinto no dia, uma so vez.
async function marcarAparelho(req, env) {
  let corpo;
  try { corpo = await req.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }
  const segredo = env.SEGREDO_CARTOES;
  const cartao = await lerFicha(corpo?.ficha, segredo);
  if (!cartao) return Response.json({ ok: false, erro: 'ficha_invalida' }, { status: 403 });
  if (!aparelhoValido(corpo?.aparelho)) return Response.json({ ok: false, erro: 'aparelho_invalido' }, { status: 400 });

  const dia = hoje();
  const chaveAfiliado = cartao.afiliado ?? 0;
  const comandos = [];

  if (typeof corpo.visita === 'string') {
    const [id, assinatura] = corpo.visita.split('.');
    if (Number(id) > 0 && assinatura === await selo(Number(id), segredo)) {
      comandos.push(env.DB.prepare(
        'UPDATE visitas SET visitante = ? WHERE id = ? AND visitante IS NULL AND dono_num = ?',
      ).bind(corpo.aparelho, Number(id), cartao.dono));
    }
  }

  // So o PRIMEIRO registo do dia deste aparelho neste cartao conta, e e assim que a contagem de
  // aparelhos distintos sai certa sem nunca varrer a tabela das visitas.
  const novo = await env.DB.prepare(
    'INSERT OR IGNORE INTO visto_dia (dia, dono_num, afiliado_num, visitante) VALUES (?, ?, ?, ?)',
  ).bind(dia, cartao.dono, chaveAfiliado, corpo.aparelho).run();

  if (novo?.meta?.changes) {
    comandos.push(env.DB.prepare(
      `INSERT INTO agregado_dia (dia, dono_num, afiliado_num, dispositivos) VALUES (?, ?, ?, 1)
       ON CONFLICT(dia, dono_num, afiliado_num) DO UPDATE SET dispositivos = dispositivos + 1`,
    ).bind(dia, cartao.dono, chaveAfiliado));
  }

  if (comandos.length) await env.DB.batch(comandos);
  return Response.json({ ok: true });
}

// As fotografias dos cartoes sao publicas: estao num cartao de visita. Sao servidas daqui, e nao
// dos ficheiros do site, para uma fotografia nova nao obrigar a publicar o site outra vez.
async function servirFoto(req, env) {
  const chave = new URL(req.url).searchParams.get('c') || '';
  if (!chave.startsWith('fotos/') || chave.includes('..')) return new Response('', { status: 404 });
  const objecto = await env.FICHEIROS.get(chave);
  if (!objecto) return new Response('', { status: 404 });
  const cabecalhos = new Headers();
  objecto.writeHttpMetadata(cabecalhos);
  cabecalhos.set('etag', objecto.httpEtag);
  cabecalhos.set('cache-control', 'public, max-age=86400');
  return new Response(objecto.body, { headers: cabecalhos });
}

function formularioManual(erro) {
  return paginaSimples(
    'Cartao McMinsky',
    `<h1>Cartão McMinsky</h1>
     <p>Escreva os dois números impressos no cartão, por baixo do código.</p>
     ${erro ? `<p style="color:#e0a0a0">${erro}</p>` : ''}
     <form method="GET" action="/c" style="margin-top:1.5rem">
       <p style="margin-bottom:1rem">
         <label style="display:inline-block;width:2.5rem">P</label>
         <input name="p" inputmode="numeric" pattern="[0-9]*" required
           style="padding:0.6rem;width:7rem;font-size:1.1rem">
       </p>
       <p style="margin-bottom:1.5rem">
         <label style="display:inline-block;width:2.5rem">A</label>
         <input name="a" inputmode="numeric" pattern="[0-9]*" required
           style="padding:0.6rem;width:7rem;font-size:1.1rem">
       </p>
       <button type="submit" style="padding:0.7rem 1.4rem;font-size:1rem;cursor:pointer">Abrir</button>
     </form>`,
    erro ? 404 : 200,
  );
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const caminho = url.pathname;

    // --- o cartao ---
    const pedido = lerCaminho(caminho);
    if (pedido) {
      const segredo = env.SEGREDO_CARTOES;
      if (!segredo) return paginaSimples('Indisponível', '<h1>Indisponível</h1><p>Falta a configuração do servidor.</p>', 503);

      const esperado = await verificador(pedido.dono, pedido.afiliado, segredo);
      // Sem verificador correcto nao se grava nada: e o caso de quem adivinhou o endereco.
      if (pedido.verificador !== esperado) {
        return paginaSimples(
          'Cartão não encontrado',
          `<h1>Cartão não encontrado</h1><p>Confirme os dois números impressos no cartão, ou
           <a href="/c">escreva-os aqui</a>.</p>`,
          404,
        );
      }

      const dono = await env.DB.prepare(
        'SELECT num, nome, pessoa_id, tipo FROM donos WHERE num = ? AND activo = 1',
      ).bind(pedido.dono).first();
      if (!dono) {
        return paginaSimples('Cartão não encontrado', '<h1>Cartão não encontrado</h1><p>Este cartão não está activo.</p>', 404);
      }

      return servirCartao(req, env, pedido, dono);
    }

    // --- entrada manual, para quem nao usa o QR ---
    //
    // Existe por uma razao dele: "o nome está só para dar mais credibilidade e para quem não queira
    // usar qrcode com medo de phishing". Aqui NAO se pede o verificador, porque ninguem o decora: o
    // que faz as vezes dele e o numero de afiliado ter de existir mesmo na base, e o travao diario
    // por cartao, que ja la estava.
    if (/^\/c\/?$/i.test(caminho)) {
      const segredo = env.SEGREDO_CARTOES;
      const qp = url.searchParams;
      if (!qp.has('p') && !qp.has('a')) return formularioManual(null);

      const p = Number(qp.get('p'));
      const a = Number(qp.get('a'));
      if (!Number.isInteger(p) || !Number.isInteger(a) || p < 1 || a < 1) {
        return formularioManual('Os dois números têm de ser números inteiros.');
      }
      const dono = await env.DB.prepare(
        'SELECT num, nome FROM donos WHERE num = ? AND activo = 1',
      ).bind(p).first();
      const afiliado = await env.DB.prepare('SELECT num FROM afiliados WHERE num = ?').bind(a).first();
      if (!dono || !afiliado) {
        return formularioManual('Não encontrei esse cartão. Confirme os dois números.');
      }
      const kk = await verificador(p, a, segredo);
      return Response.redirect(`${url.origin}/C/${p}.${a}.M.${kk}`, 302);
    }

    // --- rotas publicas do sistema de recados em voz ---
    const daVoz = await encaminharVoz(req, env, caminho);
    if (daVoz) return daVoz;

    if (caminho === '/api/visita/dispositivo' && req.method === 'POST') return marcarAparelho(req, env);
    if (caminho === '/api/foto') return servirFoto(req, env);

    // O service worker tem de ser servido DE DENTRO de /c/ para mandar em /c/: um service worker
    // so controla caminhos abaixo de onde foi servido. E por isso que vive aqui e nao em /cartao/.
    if (/^\/c\/sw\.js$/i.test(caminho)) {
      const u = new URL(req.url);
      u.pathname = '/cartao/sw.js';
      u.search = '';
      const r = await env.ASSETS.fetch(new Request(u.toString()));
      return new Response(r.body, {
        status: r.status,
        headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-cache' },
      });
    }

    // O molde da pagina do cartao so vale com os dados la dentro. Quem bate nele directamente vai
    // para o formulario de entrada manual.
    if (/^\/cartao\/?(index\.html)?$/i.test(caminho)) {
      return Response.redirect(`${url.origin}/c`, 302);
    }

    if (caminho === '/api/saude') {
      return Response.json({ ok: true, servico: 'mcminsky', ts: new Date().toISOString() });
    }

    // --- o painel ---
    if (/^\/painel/i.test(caminho) || /^\/api\/(donos|lotes|afiliados|visitas|estatisticas|pessoas)\b/.test(caminho)) {
      const senha = env.SENHA_PAINEL;
      const segredo = env.SEGREDO_CARTOES;
      if (!senha || !segredo) {
        return paginaSimples('Indisponível', '<h1>Indisponível</h1><p>Falta a configuração do servidor.</p>', 503);
      }

      if (caminho === '/painel/entrar' && req.method === 'POST') {
        const corpo = await req.formData();
        if (corpo.get('senha') !== senha) return formularioEntrada('Palavra-passe errada.');
        return new Response(null, {
          status: 302,
          headers: {
            location: '/painel',
            'set-cookie': `painel=${encodeURIComponent(await fazerBolo(segredo))}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DURACAO_SESSAO / 1000}`,
          },
        });
      }

      const dentro = await boloValido(lerBolo(req, 'painel'), segredo);
      if (!dentro) {
        if (caminho.startsWith('/api/')) return Response.json({ ok: false, erro: 'sem sessao' }, { status: 401 });
        return formularioEntrada(null);
      }

      if (caminho === '/api/donos') {
        const r = await env.DB.prepare(
          'SELECT num, nome, pessoa_id FROM donos WHERE activo = 1 ORDER BY num',
        ).all();
        return Response.json({ ok: true, donos: r.results ?? [] });
      }

      if (caminho === '/api/lotes' && req.method === 'POST') {
        let corpo;
        try { corpo = await req.json(); } catch { return Response.json({ ok: false, erro: 'corpo invalido' }, { status: 400 }); }
        const donoNum = Number(corpo?.dono);
        const quantos = Number(corpo?.quantos);
        if (!Number.isInteger(donoNum) || donoNum < 1) return Response.json({ ok: false, erro: 'dono invalido' }, { status: 400 });
        if (!Number.isInteger(quantos) || quantos < 1 || quantos > 200) {
          return Response.json({ ok: false, erro: 'quantidade fora de 1 a 200' }, { status: 400 });
        }
        const r = await reservarBloco(env, donoNum, quantos);
        return Response.json(r, { status: r.ok ? 200 : 400 });
      }

      const doPainel = await encaminharPainel(req, env, caminho);
      if (doPainel) return doPainel;

      if (caminho === '/painel' || caminho === '/painel/' || caminho === '/painel/gerador') {
        const u = new URL(req.url);
        u.pathname = '/painel/gerador.html';
        const r = await env.ASSETS.fetch(new Request(u.toString(), { headers: req.headers }));
        return new Response(r.body, {
          status: r.status,
          headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
        });
      }

      if (caminho === '/painel/qrcode-generator.js') {
        const r = await env.ASSETS.fetch(req);
        return new Response(r.body, {
          status: r.status,
          headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'public, max-age=86400' },
        });
      }

      return paginaSimples('Painel', '<h1>Painel</h1><p>Esta parte ainda não existe. <a href="/painel/gerador">Gerador de folhas</a>.</p>', 404);
    }

    // --- o site publico ---
    const resposta = await env.ASSETS.fetch(req);
    if (resposta.status === 404) {
      return paginaSimples('Página não encontrada', '<h1>Página não encontrada</h1><p><a href="/">Voltar ao início</a></p>', 404);
    }
    return resposta;
  },
};
