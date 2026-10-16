// Prova que o Worker serve EXACTAMENTE o que o GitHub Pages serve hoje, ficheiro a ficheiro.
//
// Nao basta o Worker responder 200: tem de devolver o MESMO conteudo. Por isso cada ficheiro e
// pedido aos dois sitios e compara-se o resumo do corpo. `wc -l` e `grep` provam que um ficheiro
// existe, nao que responde a pergunta.
//
// Uso: node tools/verificar-paginas.mjs [novo] [antigo]
import { createHash } from 'node:crypto';
import { readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const NOVO = process.argv[2] || 'https://mcminsky.mcminsky.workers.dev';
const ANTIGO = process.argv[3] || 'https://mcminsky.pt';

const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(raiz, 'dist');

function todos(dir, out = []) {
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) todos(p, out);
    else out.push('/' + relative(dist, p).replace(/\\/g, '/'));
  }
  return out;
}

// Depois de o dominio passar a ser servido pelo Worker, ja nao ha "antigo" para comparar: o que
// interessa provar e que o que o publico recebe e EXACTAMENTE o que esta no disco. Passar `local`
// como segundo argumento compara contra os ficheiros de dist/ em vez de contra um sitio.
import { readFileSync } from 'node:fs';
function buscarLocal(caminho) {
  const alvo = caminho === '/' ? '/index.html' : caminho;
  try {
    const buf = readFileSync(join(dist, alvo.slice(1)));
    return { estado: 200, resumo: createHash('sha256').update(buf).digest('hex').slice(0, 16), bytes: buf.length };
  } catch (e) {
    return { estado: 0, resumo: 'erro', bytes: 0, erro: String(e.message || e) };
  }
}

async function buscar(base, caminho) {
  if (base === 'local') return buscarLocal(caminho);
  try {
    const r = await fetch(base + caminho, {
      redirect: 'follow',
      headers: { 'user-agent': 'mcminsky-verificacao/1.0 (controlo interno)' },
    });
    const buf = Buffer.from(await r.arrayBuffer());
    return { estado: r.status, resumo: createHash('sha256').update(buf).digest('hex').slice(0, 16), bytes: buf.length };
  } catch (e) {
    return { estado: 0, resumo: 'erro', bytes: 0, erro: String(e.message || e) };
  }
}

// O painel esta atras de palavra-passe de proposito: o publico recebe o formulario de entrada, e
// nao o ficheiro. Comparar esses dois caminhos acusaria sempre diferenca, e uma verificacao que
// falha sempre nao verifica nada.
const ATRAS_DE_SENHA = /^\/painel\//;

const caminhos = todos(dist).filter((c) => !ATRAS_DE_SENHA.test(c)).sort();
// A raiz tambem se verifica: `/index.html` e `/` tem de dar o mesmo.
caminhos.unshift('/');

let iguais = 0;
const problemas = [];

for (const c of caminhos) {
  const [a, b] = await Promise.all([buscar(NOVO, c), buscar(ANTIGO, c)]);
  if (a.estado !== 200) {
    problemas.push(`${c}  NOVO devolveu ${a.estado}${a.erro ? ' ' + a.erro : ''}`);
  } else if (b.estado !== 200) {
    problemas.push(`${c}  ANTIGO devolveu ${b.estado} (nao da para comparar)`);
  } else if (a.resumo !== b.resumo) {
    problemas.push(`${c}  CONTEUDO DIFERENTE  novo ${a.bytes}B  antigo ${b.bytes}B`);
  } else {
    iguais += 1;
  }
}

console.log(`${caminhos.length} caminhos verificados contra ${ANTIGO}`);
console.log(`iguais: ${iguais}`);
console.log(`problemas: ${problemas.length}`);
for (const p of problemas) console.log('   ' + p);
process.exit(problemas.length ? 1 : 0);
