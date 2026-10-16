// O back office: numeros, registo recente, donos e afiliados, e a ponte para o Pessoas.
//
// Regra que manda em todas as consultas deste ficheiro: NUNCA contar o universo. Os graficos e os
// totais saem da tabela ja somada, e nao da tabela das visitas. Um ecra de estado que conta tudo a
// cada abertura custa universo vezes aberturas, e foi assim que se gastaram 1,76 milhoes de
// leituras num dia. A chave primaria do agregado comeca no dia, por isso filtrar por data ja usa o
// indice e nao varre nada.
//
// A ponte para o Pessoas responde a pergunta dele de 16 Out 2026: "põe-te no lugar de quando estou
// perante alguém novo no meio do nada". O numero do cartao ja esta impresso; o painel procura a
// pessoa no Pessoas, ou cria-a ali mesmo, e guarda so o id. Nao ha campo novo no Pessoas, que esta
// exactamente nas 100 colunas que o D1 permite.

function nao(erro, estado = 400) { return Response.json({ ok: false, erro }, { status: estado }); }

function agora() { return Math.floor(Date.now() / 1000); }

function diaMenos(n) {
  return new Date(Date.now() + 60 * 60 * 1000 - n * 86400000).toISOString().slice(0, 10);
}

function filtros(url) {
  const dono = Number(url.searchParams.get('dono'));
  const afiliado = Number(url.searchParams.get('afiliado'));
  return {
    dono: Number.isInteger(dono) && dono > 0 ? dono : null,
    afiliado: Number.isInteger(afiliado) && afiliado > 0 ? afiliado : null,
  };
}

async function estatisticas(req, env) {
  const url = new URL(req.url);
  const { dono, afiliado } = filtros(url);
  let dias = Number(url.searchParams.get('dias'));
  if (!Number.isInteger(dias) || dias < 1 || dias > 400) dias = 30;
  const desde = diaMenos(dias - 1);

  const onde = ['dia >= ?'];
  const args = [desde];
  if (dono) { onde.push('dono_num = ?'); args.push(dono); }
  if (afiliado) { onde.push('afiliado_num = ?'); args.push(afiliado); }
  const filtro = onde.join(' AND ');

  const serie = await env.DB.prepare(
    `SELECT dia, SUM(visitas) AS visitas, SUM(visitas_robo) AS robos, SUM(dispositivos) AS aparelhos
       FROM agregado_dia WHERE ${filtro} GROUP BY dia ORDER BY dia`,
  ).bind(...args).all();

  const ondeTotal = [];
  const argsTotal = [];
  if (dono) { ondeTotal.push('dono_num = ?'); argsTotal.push(dono); }
  if (afiliado) { ondeTotal.push('afiliado_num = ?'); argsTotal.push(afiliado); }
  const filtroTotal = ondeTotal.length ? 'WHERE ' + ondeTotal.join(' AND ') : '';

  const total = await env.DB.prepare(
    `SELECT COALESCE(SUM(visitas),0) AS visitas, COALESCE(SUM(visitas_robo),0) AS robos,
            COALESCE(SUM(dispositivos),0) AS aparelhos
       FROM agregado_dia ${filtroTotal}`,
  ).bind(...argsTotal).first();

  const porAfiliado = await env.DB.prepare(
    `SELECT afiliado_num, SUM(visitas) AS visitas, SUM(dispositivos) AS aparelhos
       FROM agregado_dia ${filtroTotal} GROUP BY afiliado_num
      ORDER BY visitas DESC LIMIT 12`,
  ).bind(...argsTotal).all();

  const porDono = await env.DB.prepare(
    `SELECT a.dono_num, d.nome, SUM(a.visitas) AS visitas
       FROM agregado_dia a JOIN donos d ON d.num = a.dono_num
      GROUP BY a.dono_num ORDER BY visitas DESC LIMIT 12`,
  ).all();

  const conversas = await env.DB.prepare(
    `SELECT COUNT(*) AS conversas,
            (SELECT COUNT(*) FROM mensagens WHERE papel = 'visitante') AS recados,
            (SELECT COUNT(*) FROM mensagens WHERE estado IN ('pendente','a_atender')) AS por_atender,
            (SELECT COUNT(*) FROM conversas WHERE para_humano = 1) AS para_humano
       FROM conversas`,
  ).first();

  return Response.json({
    ok: true,
    desde,
    serie: serie.results ?? [],
    total,
    por_afiliado: porAfiliado.results ?? [],
    por_dono: porDono.results ?? [],
    voz: conversas,
  });
}

// O registo corrido. Pagina-se pelo id, que ja esta por ordem de insercao, e nao por data: evita um
// indice so para isso, e cada indice a mais multiplica as linhas cobradas por cada visita gravada.
async function registoVisitas(req, env) {
  const url = new URL(req.url);
  const { dono, afiliado } = filtros(url);
  let limite = Number(url.searchParams.get('limite'));
  if (!Number.isInteger(limite) || limite < 1 || limite > 200) limite = 60;
  const antes = Number(url.searchParams.get('antes'));

  const onde = [];
  const args = [];
  if (dono) { onde.push('dono_num = ?'); args.push(dono); }
  if (afiliado) { onde.push('afiliado_num = ?'); args.push(afiliado); }
  if (Number.isInteger(antes) && antes > 0) { onde.push('id < ?'); args.push(antes); }
  const filtro = onde.length ? 'WHERE ' + onde.join(' AND ') : '';

  const r = await env.DB.prepare(
    `SELECT id, ts, dono_num, afiliado_num, origem, dispositivo, pais, robo,
            CASE WHEN visitante IS NULL THEN 0 ELSE 1 END AS tem_aparelho,
            substr(visitante, 1, 6) AS aparelho
       FROM visitas ${filtro} ORDER BY id DESC LIMIT ?`,
  ).bind(...args, limite).all();

  return Response.json({ ok: true, visitas: r.results ?? [] });
}

async function listarAfiliados(req, env) {
  const url = new URL(req.url);
  let limite = Number(url.searchParams.get('limite'));
  if (!Number.isInteger(limite) || limite < 1 || limite > 300) limite = 100;
  const q = (url.searchParams.get('q') || '').trim();

  let consulta = `SELECT num, nome, pessoa_id, nota, lote_id, criado_em, atribuido_em
                    FROM afiliados`;
  const args = [];
  if (q) {
    if (/^\d+$/.test(q)) { consulta += ' WHERE num = ?'; args.push(Number(q)); }
    else { consulta += ' WHERE nome LIKE ?'; args.push('%' + q + '%'); }
  }
  consulta += ' ORDER BY num DESC LIMIT ?';
  args.push(limite);

  const r = await env.DB.prepare(consulta).bind(...args).all();
  return Response.json({ ok: true, afiliados: r.results ?? [] });
}

async function guardarAfiliado(req, env) {
  let corpo;
  try { corpo = await req.json(); } catch { return nao('corpo_invalido'); }
  const num = Number(corpo?.num);
  if (!Number.isInteger(num) || num < 1) return nao('numero_invalido');
  const nome = corpo?.nome ? String(corpo.nome).slice(0, 160).trim() : null;
  const nota = corpo?.nota ? String(corpo.nota).slice(0, 500) : null;
  const pessoa = Number(corpo?.pessoa_id);

  const existe = await env.DB.prepare('SELECT num, atribuido_em FROM afiliados WHERE num = ?').bind(num).first();
  if (!existe) return nao('nao_existe', 404);

  await env.DB.prepare(
    `UPDATE afiliados SET nome = ?, nota = ?, pessoa_id = ?,
            atribuido_em = COALESCE(atribuido_em, CASE WHEN ? IS NULL THEN NULL ELSE ? END)
      WHERE num = ?`,
  ).bind(nome, nota, Number.isInteger(pessoa) && pessoa > 0 ? pessoa : null, nome, agora(), num).run();

  return Response.json({ ok: true });
}

async function listarOuCriarDono(req, env) {
  if (req.method === 'GET') {
    const r = await env.DB.prepare(
      'SELECT num, nome, pessoa_id, tipo, activo FROM donos ORDER BY num',
    ).all();
    return Response.json({ ok: true, donos: r.results ?? [] });
  }
  let corpo;
  try { corpo = await req.json(); } catch { return nao('corpo_invalido'); }
  const nome = String(corpo?.nome || '').trim().slice(0, 160);
  if (nome.length < 2) return nao('nome_invalido');
  const tipo = corpo?.tipo === 'especialista' ? 'especialista' : 'pessoa';
  const pessoa = Number(corpo?.pessoa_id);

  const topo = await env.DB.prepare('SELECT COALESCE(MAX(num), 0) AS m FROM donos').first();
  const num = (topo?.m ?? 0) + 1;
  await env.DB.prepare(
    'INSERT INTO donos (num, nome, pessoa_id, tipo, activo, criado_em) VALUES (?, ?, ?, ?, 1, ?)',
  ).bind(num, nome, Number.isInteger(pessoa) && pessoa > 0 ? pessoa : null, tipo, agora()).run();

  // Um dono sem perfil da uma pagina de cartao vazia. Nasce ja com o minimo, para o cartao abrir.
  await env.DB.prepare(
    'INSERT INTO perfis (dono_num, nome, gemeo_activo, actualizado_em) VALUES (?, ?, 0, ?)',
  ).bind(num, nome, agora()).run();

  return Response.json({ ok: true, num });
}

// ---------------------------------------------------------------------------
// A ponte para o Pessoas

async function pessoas(req, env, caminho) {
  if (!env.PESSOAS || !env.CHAVE_PESSOAS) {
    return Response.json({ ok: false, erro: 'sem_ligacao' }, { status: 503 });
  }
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const q = (url.searchParams.get('q') || '').trim();
    if (q.length < 2) return Response.json({ ok: true, pessoas: [] });
    const r = await env.PESSOAS.fetch(
      new Request('https://pessoas/api/people?limit=8&q=' + encodeURIComponent(q), {
        headers: { authorization: 'Bearer ' + env.CHAVE_PESSOAS },
      }),
    );
    if (!r.ok) return Response.json({ ok: false, erro: 'pessoas_' + r.status }, { status: 502 });
    const j = await r.json();
    return Response.json({
      ok: true,
      pessoas: (j.people || []).map((p) => ({
        id: p.id, nome: p.full_name, tratamento: p.preferred_name, titulo: p.headline,
      })),
    });
  }

  let corpo;
  try { corpo = await req.json(); } catch { return nao('corpo_invalido'); }
  const nome = String(corpo?.nome || '').trim();
  if (nome.length < 2) return nao('nome_invalido');
  const r = await env.PESSOAS.fetch(new Request('https://pessoas/api/people', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + env.CHAVE_PESSOAS, 'content-type': 'application/json' },
    body: JSON.stringify({ full_name: nome }),
  }));
  if (!r.ok) return Response.json({ ok: false, erro: 'pessoas_' + r.status }, { status: 502 });
  const j = await r.json();
  return Response.json({ ok: true, id: j.id ?? j.person?.id ?? null, nome });
}

// ---------------------------------------------------------------------------

export async function encaminhar(req, env, caminho) {
  if (caminho === '/api/estatisticas') return estatisticas(req, env);
  if (caminho === '/api/visitas') return registoVisitas(req, env);
  if (caminho === '/api/afiliados' && req.method === 'GET') return listarAfiliados(req, env);
  if (caminho === '/api/afiliados' && req.method === 'POST') return guardarAfiliado(req, env);
  if (caminho === '/api/donos' && req.method === 'POST') return listarOuCriarDono(req, env);
  if (caminho === '/api/pessoas') return pessoas(req, env, caminho);

  if (caminho === '/painel/estatisticas' || caminho === '/painel' || caminho === '/painel/') {
    const u = new URL(req.url);
    u.pathname = '/painel/estatisticas.html';
    u.search = '';
    const r = await env.ASSETS.fetch(new Request(u.toString()));
    return new Response(r.body, {
      status: r.status,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  // O nosso codigo muda a cada publicacao e NAO pode ficar guardado no browser: ja aconteceu olhar
  // para um painel com a folha de estilo nova e o codigo velho, e andar a procurar o erro no sitio
  // errado. As bibliotecas de fora tem versao fixa no nome e essas ficam guardadas.
  if (caminho === '/painel/estatisticas.js') {
    const r = await env.ASSETS.fetch(req);
    return new Response(r.body, {
      status: r.status,
      headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-cache' },
    });
  }

  if (caminho === '/painel/vendor/chart.umd.min.js') {
    const r = await env.ASSETS.fetch(req);
    return new Response(r.body, {
      status: r.status,
      headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'public, max-age=86400' },
    });
  }

  return null;
}
