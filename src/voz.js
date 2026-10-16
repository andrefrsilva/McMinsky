// O sistema de recados em voz para o duplo digital: receber, pôr em fila, servir a quem atende, e
// devolver a resposta.
//
// A forma vem toda dos requisitos dele de 16 Out 2026, e cada um deixou marca no codigo:
//
//  "tem de dar para usar o claude code agentic com um especialista para isto e a ler a partir de
//   fila que acumula pedidos e os vê em série"  -> /api/voz/fila entrega UMA mensagem de cada vez,
//   a mais antiga por atender, e marca-a como em atendimento para dois atendedores nunca pegarem
//   na mesma.
//
//  "tem de dar para ter contexto da conversa anterior a cada atendimento"  -> a fila entrega
//   tambem a conversa inteira ate aquele ponto, nao so a mensagem solta.
//
//  "tem de dar para limitar uso abusivo"  -> ha tres travoes: tamanho e duracao de cada mensagem,
//   quantas mensagens e quantos segundos por aparelho e por dia, e o travao de escritas da conta
//   que ja protegia as visitas. Sem isto, um cartao publico e um balde sem fundo.
//
//  "tem de dar para ficar registado para dar para rever ou reouvir depois"  -> o audio vai para o
//   R2 e a mensagem fica na base; nada e apagado por nos ao fim da conversa.

import { lerFicha, aparelhoValido } from './ficha.js';

const MAX_BYTES = 3 * 1024 * 1024;   // 3 MB: 90 segundos de opus cabem com folga
const MAX_MS = 95 * 1000;
const MAX_TEXTO = 1200;
// NAO ha limite de mensagens nem de segundos por pessoa. Ordem dele a 16 Out 2026:
// "nao quero nada destes limites! quem me dera ter muita gente a visitar o cartao e eu ter de
//  pagar os limites para lá do free da cloudflare! tens de ter atenção é no TEU uso e se cada
//  visita está otimizada para gastar o menos possível. nao nas visitas das pessoas."
// O que fica e o tamanho e a duracao de CADA mensagem, que nao sao limites de uso: sao o formato
// do produto (um recado de voz, nao um ficheiro de uma hora). O cuidado com o custo passou para o
// lado de ca: menos escritas por visita.

function hoje() {
  return new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 10);
}

function agora() { return Math.floor(Date.now() / 1000); }

function nao(erro, estado = 400) { return Response.json({ ok: false, erro }, { status: estado }); }

function extensaoDe(tipo) {
  const t = String(tipo || '');
  if (t.includes('mp4') || t.includes('m4a') || t.includes('aac')) return 'm4a';
  if (t.includes('ogg')) return 'ogg';
  if (t.includes('mpeg') || t.includes('mp3')) return 'mp3';
  if (t.includes('wav')) return 'wav';
  return 'webm';
}

async function conversaDe(env, dono, afiliado, aparelho) {
  const existente = await env.DB.prepare(
    'SELECT id, estado FROM conversas WHERE dono_num = ? AND visitante = ?',
  ).bind(dono, aparelho).first();
  if (existente) return existente.id;
  const nova = await env.DB.prepare(
    `INSERT INTO conversas (dono_num, afiliado_num, visitante, criado_em, ultima_em)
     VALUES (?, ?, ?, ?, ?) RETURNING id`,
  ).bind(dono, afiliado, aparelho, agora(), agora()).first();
  return nova.id;
}

// ---------------------------------------------------------------------------
// Quem fala com o cartao

export async function receberMensagem(req, env) {
  const segredo = env.SEGREDO_CARTOES;
  let forma;
  try { forma = await req.formData(); } catch { return nao('corpo_invalido'); }

  const cartao = await lerFicha(forma.get('ficha'), segredo);
  if (!cartao) return nao('ficha_invalida', 403);

  const aparelho = forma.get('aparelho');
  if (!aparelhoValido(aparelho)) return nao('aparelho_invalido', 400);

  const texto = (forma.get('texto') || '').toString().trim();
  const audio = forma.get('audio');
  const ms = Math.min(MAX_MS, Math.max(0, Number(forma.get('ms')) || 0));

  if (!texto && !(audio && typeof audio === 'object')) return nao('vazio');
  if (texto.length > MAX_TEXTO) return nao('muito_grande');
  if (audio && typeof audio === 'object') {
    if (audio.size > MAX_BYTES) return nao('muito_grande');
    if (audio.size < 600) return nao('muito_curta');
    if (ms > MAX_MS) return nao('muito_longa');
  }

  const conversa = await conversaDe(env, cartao.dono, cartao.afiliado, aparelho);

  let chave = null;
  if (audio && typeof audio === 'object') {
    chave = `audio/${conversa}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensaoDe(audio.type)}`;
    try {
      await env.FICHEIROS.put(chave, audio.stream(), {
        httpMetadata: { contentType: audio.type || 'audio/webm' },
      });
    } catch {
      return nao('guardar_falhou', 500);
    }
  }

  const mensagem = await env.DB.prepare(
    `INSERT INTO mensagens (conversa_id, papel, texto, audio_chave, audio_ms, estado, criado_em)
     VALUES (?, 'visitante', ?, ?, ?, 'pendente', ?) RETURNING id`,
  ).bind(conversa, texto || null, chave, chave ? ms : null, agora()).first();

  // Uma escrita, nao tres: cada linha a menos por mensagem e orcamento que fica para quem visita.
  await env.DB.prepare('UPDATE conversas SET ultima_em = ? WHERE id = ?').bind(agora(), conversa).run();

  // A posicao na fila e quantas mensagens por atender estao a frente desta. E uma estimativa
  // honesta, e e por isso que o numero que a pagina mostra comeca aqui e nao num valor inventado.
  const frente = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM mensagens WHERE estado IN ('pendente','a_atender') AND id < ?",
  ).bind(mensagem.id).first();

  return Response.json({
    ok: true,
    conversa,
    mensagem: mensagem.id,
    posicao: (frente?.n ?? 0) + 1,
  });
}

export async function verConversa(req, env) {
  const url = new URL(req.url);
  const cartao = await lerFicha(url.searchParams.get('ficha'), env.SEGREDO_CARTOES);
  if (!cartao) return nao('ficha_invalida', 403);
  const aparelho = url.searchParams.get('aparelho');
  if (!aparelhoValido(aparelho)) return nao('aparelho_invalido');

  const conversa = await env.DB.prepare(
    'SELECT id, estado, para_humano FROM conversas WHERE dono_num = ? AND visitante = ?',
  ).bind(cartao.dono, aparelho).first();
  if (!conversa) return Response.json({ ok: true, conversa: null, mensagens: [] });

  const r = await env.DB.prepare(
    `SELECT id, papel, texto, audio_chave IS NOT NULL AS audio, audio_ms, estado, criado_em, resposta_de
     FROM mensagens WHERE conversa_id = ? ORDER BY id LIMIT 60`,
  ).bind(conversa.id).all();

  return new Response(JSON.stringify({
    ok: true,
    conversa: conversa.id,
    para_humano: conversa.para_humano,
    mensagens: (r.results ?? []).map((m) => ({ ...m, audio: !!m.audio })),
  }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}

export async function ouvirAudio(req, env) {
  const url = new URL(req.url);
  const cartao = await lerFicha(url.searchParams.get('ficha'), env.SEGREDO_CARTOES);
  if (!cartao) return nao('ficha_invalida', 403);
  const aparelho = url.searchParams.get('aparelho');
  if (!aparelhoValido(aparelho)) return nao('aparelho_invalido');
  const id = Number(url.searchParams.get('mensagem'));
  if (!Number.isInteger(id)) return nao('mensagem_invalida');

  // A junta com conversas e o que impede alguem de ouvir o audio de outra pessoa trocando o numero
  // da mensagem: a mensagem tem de pertencer a uma conversa DESTE aparelho.
  const m = await env.DB.prepare(
    `SELECT m.audio_chave FROM mensagens m
       JOIN conversas c ON c.id = m.conversa_id
      WHERE m.id = ? AND c.visitante = ? AND c.dono_num = ?`,
  ).bind(id, aparelho, cartao.dono).first();
  if (!m || !m.audio_chave) return nao('nao_existe', 404);

  return servirDoR2(req, env, m.audio_chave);
}

async function servirDoR2(req, env, chave) {
  const alcance = req.headers.get('range');
  const objecto = await env.FICHEIROS.get(chave, alcance ? { range: req.headers } : undefined);
  if (!objecto) return nao('nao_existe', 404);

  const cabecalhos = new Headers();
  objecto.writeHttpMetadata(cabecalhos);
  cabecalhos.set('etag', objecto.httpEtag);
  cabecalhos.set('cache-control', 'private, max-age=3600');
  cabecalhos.set('accept-ranges', 'bytes');
  if (objecto.range && alcance) {
    const inicio = objecto.range.offset ?? 0;
    const tamanho = objecto.range.length ?? (objecto.size - inicio);
    cabecalhos.set('content-range', `bytes ${inicio}-${inicio + tamanho - 1}/${objecto.size}`);
    return new Response(objecto.body, { status: 206, headers: cabecalhos });
  }
  return new Response(objecto.body, { headers: cabecalhos });
}

export async function pedirHumano(req, env) {
  let corpo;
  try { corpo = await req.json(); } catch { return nao('corpo_invalido'); }
  const cartao = await lerFicha(corpo?.ficha, env.SEGREDO_CARTOES);
  if (!cartao) return nao('ficha_invalida', 403);
  if (!aparelhoValido(corpo?.aparelho)) return nao('aparelho_invalido');
  await env.DB.prepare(
    "UPDATE conversas SET para_humano = 1, estado = 'humano' WHERE dono_num = ? AND visitante = ?",
  ).bind(cartao.dono, corpo.aparelho).run();
  return Response.json({ ok: true });
}

// ---------------------------------------------------------------------------
// Quem atende. Tudo aqui exige a chave de servico, que vive so como segredo do Worker.

function servicoAutorizado(req, env) {
  const chave = env.CHAVE_SERVICO;
  if (!chave) return false;
  const dado = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (dado.length !== chave.length) return false;
  let igual = 0;
  for (let i = 0; i < chave.length; i++) igual |= chave.charCodeAt(i) ^ dado.charCodeAt(i);
  return igual === 0;
}

export async function filaDeAtendimento(req, env) {
  if (!servicoAutorizado(req, env)) return nao('sem_permissao', 401);
  const url = new URL(req.url);
  const espreitar = url.searchParams.get('espreitar') === '1';

  const m = await env.DB.prepare(
    `SELECT id, conversa_id, texto, audio_chave, audio_ms, criado_em
       FROM mensagens WHERE estado = 'pendente' AND papel = 'visitante'
      ORDER BY id LIMIT 1`,
  ).first();
  if (!m) {
    const quantos = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM mensagens WHERE estado = 'a_atender'",
    ).first();
    return Response.json({ ok: true, mensagem: null, a_atender: quantos?.n ?? 0 });
  }

  const conversa = await env.DB.prepare(
    `SELECT c.id, c.dono_num, c.afiliado_num, c.visitante, c.nome, c.contacto, c.para_humano,
            d.nome AS dono_nome, p.nome AS perfil_nome, p.papel, p.bio, p.gemeo_nome, p.gemeo_voz
       FROM conversas c
       JOIN donos d ON d.num = c.dono_num
       LEFT JOIN perfis p ON p.dono_num = c.dono_num
      WHERE c.id = ?`,
  ).bind(m.conversa_id).first();

  const antes = await env.DB.prepare(
    `SELECT id, papel, texto, audio_ms, criado_em FROM mensagens
      WHERE conversa_id = ? AND id < ? ORDER BY id DESC LIMIT 20`,
  ).bind(m.conversa_id, m.id).all();

  if (!espreitar) {
    await env.DB.prepare("UPDATE mensagens SET estado = 'a_atender' WHERE id = ?").bind(m.id).run();
  }

  return Response.json({
    ok: true,
    mensagem: {
      id: m.id,
      conversa: m.conversa_id,
      texto: m.texto,
      tem_audio: !!m.audio_chave,
      audio_ms: m.audio_ms,
      criado_em: m.criado_em,
      audio_url: m.audio_chave ? `/api/voz/servico/audio?mensagem=${m.id}` : null,
    },
    cartao: conversa,
    contexto: (antes.results ?? []).reverse(),
  });
}

export async function audioDeServico(req, env) {
  if (!servicoAutorizado(req, env)) return nao('sem_permissao', 401);
  const id = Number(new URL(req.url).searchParams.get('mensagem'));
  if (!Number.isInteger(id)) return nao('mensagem_invalida');
  const m = await env.DB.prepare('SELECT audio_chave FROM mensagens WHERE id = ?').bind(id).first();
  if (!m || !m.audio_chave) return nao('nao_existe', 404);
  return servirDoR2(req, env, m.audio_chave);
}

export async function responder(req, env) {
  if (!servicoAutorizado(req, env)) return nao('sem_permissao', 401);
  let forma;
  try { forma = await req.formData(); } catch { return nao('corpo_invalido'); }

  const responde = Number(forma.get('mensagem'));
  const texto = (forma.get('texto') || '').toString().trim();
  const transcricao = (forma.get('transcricao') || '').toString().trim();
  const papel = (forma.get('papel') || 'gemeo').toString();
  const audio = forma.get('audio');
  if (!Number.isInteger(responde)) return nao('mensagem_invalida');
  if (!['gemeo', 'humano'].includes(papel)) return nao('papel_invalido');
  if (!texto && !(audio && typeof audio === 'object')) return nao('vazio');

  const original = await env.DB.prepare(
    'SELECT id, conversa_id FROM mensagens WHERE id = ?',
  ).bind(responde).first();
  if (!original) return nao('nao_existe', 404);

  let chave = null;
  if (audio && typeof audio === 'object') {
    if (audio.size > MAX_BYTES * 3) return nao('muito_grande');
    chave = `audio/${original.conversa_id}/resposta-${Date.now()}.${extensaoDe(audio.type)}`;
    await env.FICHEIROS.put(chave, audio.stream(), {
      httpMetadata: { contentType: audio.type || 'audio/mpeg' },
    });
  }

  const ms = Math.max(0, Number(forma.get('ms')) || 0);
  const nova = await env.DB.prepare(
    `INSERT INTO mensagens (conversa_id, papel, texto, audio_chave, audio_ms, estado, criado_em, atendido_em, resposta_de)
     VALUES (?, ?, ?, ?, ?, 'respondida', ?, ?, ?) RETURNING id`,
  ).bind(original.conversa_id, papel, texto || null, chave, chave ? ms : null, agora(), agora(), responde).first();

  await env.DB.batch([
    env.DB.prepare(
      "UPDATE mensagens SET estado = 'respondida', atendido_em = ?, texto = COALESCE(NULLIF(?, ''), texto) WHERE id = ?",
    ).bind(agora(), transcricao, responde),
    env.DB.prepare('UPDATE conversas SET ultima_em = ? WHERE id = ?').bind(agora(), original.conversa_id),
  ]);

  return Response.json({ ok: true, mensagem: nova.id });
}

export async function encaminhar(req, env, caminho) {
  if (caminho === '/api/voz/mensagem' && req.method === 'POST') return receberMensagem(req, env);
  if (caminho === '/api/voz/conversa') return verConversa(req, env);
  if (caminho === '/api/voz/audio') return ouvirAudio(req, env);
  if (caminho === '/api/voz/humano' && req.method === 'POST') return pedirHumano(req, env);
  if (caminho === '/api/voz/fila') return filaDeAtendimento(req, env);
  if (caminho === '/api/voz/servico/audio') return audioDeServico(req, env);
  if (caminho === '/api/voz/responder' && req.method === 'POST') return responder(req, env);
  return null;
}
