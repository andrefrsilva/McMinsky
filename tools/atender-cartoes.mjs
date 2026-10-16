// Atender a fila de recados dos cartoes, a mao, enquanto o especialista verdadeiro nao existe.
//
// Porque existe: um sistema de recados sem ninguem a atender nao e um sistema, e uma caixa fechada.
// Isto deixa a fila utilizavel HOJE, pelo Andre ou por mim, com os mesmos pontos de entrada que o
// especialista vai usar depois. Quando ele existir, troca-se quem corre isto e mais nada.
//
// Uso:
//   node tools/atender-cartoes.mjs ver                      espreita a fila sem a tomar
//   node tools/atender-cartoes.mjs atender                  toma o recado mais antigo e transcreve
//   node tools/atender-cartoes.mjs responder <id> "texto" [voz]
//        voz: duarte (omissao), raquel, nenhuma
//
// A chave de servico vive fora do vault, em C:/Users/andre/.claude/cartoes-chave-servico.txt.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const BASE = process.env.CARTOES_BASE || 'https://mcminsky.pt';
const CHAVE = readFileSync('C:/Users/andre/.claude/cartoes-chave-servico.txt', 'utf8').trim();
const PASTA = 'C:/Users/andre/brain/FILES/cartoes-recados';
const TTS = 'C:/Users/andre/brain/tts.mjs';
const STT = 'C:/Users/andre/brain/stt.py';

function cabecalho() { return { authorization: 'Bearer ' + CHAVE }; }

async function buscar(caminho, opcoes = {}) {
  const r = await fetch(BASE + caminho, { ...opcoes, headers: { ...cabecalho(), ...(opcoes.headers || {}) } });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { ok: false, erro: 'resposta nao e json', estado: r.status, corpo: t.slice(0, 200) }; }
}

function hora(ts) { return new Date(ts * 1000).toLocaleString('pt-PT'); }

async function ver() {
  const j = await buscar('/api/voz/fila?espreitar=1');
  if (!j.ok) { console.log('erro:', j.erro); return; }
  if (!j.mensagem) { console.log('fila vazia. em atendimento:', j.a_atender ?? 0); return; }
  console.log(`recado ${j.mensagem.id}, cartao ${j.cartao.dono_num}.${j.cartao.afiliado_num}, de ${hora(j.mensagem.criado_em)}`);
  console.log(j.mensagem.tem_audio ? `  audio de ${Math.round((j.mensagem.audio_ms || 0) / 1000)}s` : `  texto: ${j.mensagem.texto}`);
  console.log(`  contexto: ${j.contexto.length} mensagens anteriores`);
}

async function atender() {
  const j = await buscar('/api/voz/fila');
  if (!j.ok) { console.log('erro:', j.erro); return; }
  if (!j.mensagem) { console.log('fila vazia.'); return; }

  const m = j.mensagem;
  const c = j.cartao;
  if (!existsSync(PASTA)) mkdirSync(PASTA, { recursive: true });

  console.log('='.repeat(70));
  console.log(`RECADO ${m.id}  |  cartao ${c.dono_num}.${c.afiliado_num}  |  ${hora(m.criado_em)}`);
  console.log(`cartao de: ${c.perfil_nome || c.dono_nome}  (${c.papel || ''})`);
  console.log(`duplo digital: ${c.gemeo_nome || '(sem nome)'}  |  voz: ${c.gemeo_voz}`);
  if (c.nome || c.contacto) console.log(`quem fala: ${c.nome || '?'}  ${c.contacto || ''}`);
  if (c.para_humano) console.log('ATENCAO: esta pessoa pediu para falar com a pessoa real.');

  if (j.contexto.length) {
    console.log('-'.repeat(70));
    console.log('CONTEXTO:');
    for (const a of j.contexto) {
      console.log(`  [${a.papel}] ${(a.texto || '(audio)').slice(0, 220)}`);
    }
  }

  console.log('-'.repeat(70));
  if (m.tem_audio) {
    const r = await fetch(BASE + m.audio_url, { headers: cabecalho() });
    const bytes = Buffer.from(await r.arrayBuffer());
    const ficheiro = join(PASTA, `recado-${m.id}.webm`);
    writeFileSync(ficheiro, bytes);
    console.log(`audio guardado: ${ficheiro} (${bytes.length} bytes, ${Math.round((m.audio_ms || 0) / 1000)}s)`);
    try {
      const texto = execFileSync('python', ['-I', STT, ficheiro], { encoding: 'utf8', timeout: 240000 }).trim();
      console.log('TRANSCRICAO:');
      console.log('  ' + texto.replace(/\n/g, '\n  '));
      writeFileSync(join(PASTA, `recado-${m.id}.txt`), texto, 'utf8');
    } catch (e) {
      console.log('nao consegui transcrever:', String(e.message || e).slice(0, 200));
    }
  } else {
    console.log('TEXTO:');
    console.log('  ' + (m.texto || ''));
  }

  console.log('-'.repeat(70));
  console.log(`para responder:  node tools/atender-cartoes.mjs responder ${m.id} "a sua resposta" duarte`);
}

async function responder(id, texto, voz = 'duarte') {
  if (!id || !texto) { console.log('falta o id ou o texto'); return; }

  const forma = new FormData();
  forma.append('mensagem', String(id));
  forma.append('papel', 'gemeo');
  forma.append('texto', texto);

  const transcrito = join(PASTA, `recado-${id}.txt`);
  if (existsSync(transcrito)) forma.append('transcricao', readFileSync(transcrito, 'utf8').trim());

  if (voz !== 'nenhuma') {
    const nome = voz.toLowerCase() === 'raquel' ? 'Raquel' : 'Duarte';
    // O texto para a voz nao leva simbolos nem caminhos: o ouvido le palavras, nao sinais.
    const oral = texto.replace(/[%€→×≈≥≤±✓✗]/g, ' ').replace(/\s+/g, ' ').trim();
    const saida = execFileSync('node', [TTS, oral, nome], { encoding: 'utf8', timeout: 180000 }).trim();
    const mp3 = saida.split(/\r?\n/).pop().trim();
    const bytes = readFileSync(mp3);
    forma.append('audio', new Blob([bytes], { type: 'audio/mpeg' }), 'resposta.mp3');
    console.log('voz gerada:', mp3, `(${bytes.length} bytes, ${nome})`);
  }

  const r = await fetch(BASE + '/api/voz/responder', { method: 'POST', headers: cabecalho(), body: forma });
  const j = await r.json();
  console.log(j.ok ? `respondido. mensagem ${j.mensagem} entregue.` : `falhou: ${j.erro}`);
}

const [, , comando, ...resto] = process.argv;
if (comando === 'ver') await ver();
else if (comando === 'atender') await atender();
else if (comando === 'responder') await responder(resto[0], resto[1], resto[2]);
else {
  console.log('comandos: ver | atender | responder <id> "texto" [duarte|raquel|nenhuma]');
}
