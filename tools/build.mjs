// Monta a pasta dist/ com EXACTAMENTE o que vai ser servido, e mais nada.
//
// Existe por causa de duas licoes da casa:
//  - compilar na pasta errada publica um servidor sem interface, e so se percebe no browser;
//  - apontar os ficheiros estaticos para a raiz do repositorio publicaria tambem o .git, o
//    wrangler.jsonc, o src/ e as notas internas. A lista de baixo e uma AUTORIZACAO EXPLICITA:
//    o que nao esta aqui nao e servido.
//
// Uso: node tools/build.mjs
import { cpSync, existsSync, mkdirSync, rmSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const destino = join(raiz, 'dist');

// O site como ele existe hoje no GitHub Pages. Cada entrada e um ficheiro ou uma pasta na raiz.
const SERVIR = [
  'index.html',
  'adhd',
  'afiliados',
  'articles',
  'cartao',   // a pagina do cartao pessoal: so o Worker a serve, e com os dados ja por dentro.
  'css',
  'en',
  'events',
  'institucional',
  'js',
  'legal',
  'live1',
  'media',
  'metodo',
  'pages',
  'painel',   // back office: a pagina do gerador e a biblioteca de QR. So o Worker a serve, e so depois da palavra-passe.
  'programas',
];

// O que NUNCA vai para o dist, mesmo que apareca dentro das pastas acima.
const EXCLUIR = new Set(['.git', '.wrangler', '.claude', 'node_modules', 'dist', 'Thumbs.db', '.DS_Store']);

// Copias de seguranca NUNCA sao servidas. Tudo o que esta dentro de uma pasta do site vai para
// a internet, e um .bak de uma pagina legal publicado e a versao antiga a contradizer a nova.
const RESIDUO = /(\.bak(-[\w.-]*)?|\.orig|\.rej|\.tmp|\.swp|~)$/i;

rmSync(destino, { recursive: true, force: true });
mkdirSync(destino, { recursive: true });

let ficheiros = 0;
let bytes = 0;

function contar(caminho) {
  const st = statSync(caminho);
  if (st.isDirectory()) {
    for (const nome of readdirSync(caminho)) {
      if (EXCLUIR.has(nome)) continue;
      contar(join(caminho, nome));
    }
  } else {
    ficheiros += 1;
    bytes += st.size;
  }
}

const faltam = [];
for (const item of SERVIR) {
  const origem = join(raiz, item);
  if (!existsSync(origem)) {
    faltam.push(item);
    continue;
  }
  cpSync(origem, join(destino, item), {
    recursive: true,
    filter: (src) => {
      const nome = src.split(/[\\/]/).pop();
      return !EXCLUIR.has(nome) && !RESIDUO.test(nome);
    },
  });
  contar(join(destino, item));
}

console.log(`dist/ com ${ficheiros} ficheiros, ${(bytes / 1024 / 1024).toFixed(2)} MB`);
if (faltam.length) {
  console.error(`FALTAM na raiz do repositorio: ${faltam.join(', ')}`);
  process.exit(1);
}
