// A "ficha" e o bilhete que a pagina do cartao recebe quando e servida, e que tem de apresentar em
// todos os pedidos que faz a seguir.
//
// Porque existe: sem ela, qualquer pessoa podia atirar mensagens de voz para a fila escrevendo um
// numero de cartao a sorte, e isso custa dinheiro (armazenamento), custa escritas na base, e enche
// a fila de quem atende. Com ela, so quem abriu mesmo um cartao valido pode falar.
//
// O que NAO e: nao e identificacao de pessoa. Diz apenas qual o cartao e ate quando vale. Quem a
// pessoa e, se e que chega a ser alguem, vem do codigo do aparelho, que e dela e so existe com
// consentimento ou quando ela propria comeca uma mensagem.

const VALIDADE = 24 * 60 * 60 * 1000;

function base64Url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function assinar(texto, segredo) {
  const chave = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return base64Url(new Uint8Array(await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(texto))));
}

export async function criarFicha(dono, afiliado, segredo) {
  const corpo = `${dono}.${afiliado}.${Date.now() + VALIDADE}`;
  return `${corpo}.${await assinar(corpo, segredo)}`;
}

export async function lerFicha(ficha, segredo) {
  if (typeof ficha !== 'string' || ficha.length > 200) return null;
  const partes = ficha.split('.');
  if (partes.length !== 4) return null;
  const [dono, afiliado, expira, assinatura] = partes;
  const corpo = `${dono}.${afiliado}.${expira}`;
  const esperado = await assinar(corpo, segredo);
  if (esperado.length !== assinatura.length) return null;
  let igual = 0;
  for (let i = 0; i < esperado.length; i++) igual |= esperado.charCodeAt(i) ^ assinatura.charCodeAt(i);
  if (igual !== 0) return null;
  if (Number(expira) < Date.now()) return null;
  const p = Number(dono);
  const a = Number(afiliado);
  if (!Number.isInteger(p) || p < 1) return null;
  return { dono: p, afiliado: Number.isInteger(a) && a > 0 ? a : null };
}

// Alfabeto sem caracteres confundiveis a olho (sem I, O, 0, 1) e todo dentro do modo denso do QR.
const ALFABETO = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

// Duas letras de verificacao a partir do par e de um segredo nosso. Duas letras dao 1 em 1.024, e
// MEDIDO a 16 Out 2026: passar de uma para duas letras nao aumenta o tamanho do QR, logo e de graca.
// Serve para que escrever /C/1.1, /C/1.2, ... nao de cartoes validos: sem isto, qualquer um suja as
// estatisticas e, pior, gasta o orcamento de escritas da conta.
//
// Vive AQUI, e nao no ficheiro do Worker, porque o painel tambem precisa dele para montar as
// ligacoes que ele copia. Se ficasse la, os dois ficheiros importavam-se um ao outro.
export async function verificador(dono, afiliado, segredo) {
  const chave = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const assinatura = new Uint8Array(
    await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(`${dono}.${afiliado}`)),
  );
  return ALFABETO[assinatura[0] % 32] + ALFABETO[assinatura[1] % 32];
}

// O codigo do aparelho e gerado no browser: 32 caracteres hexadecimais, um ponto, e a data em que
// nasceu. Validar a FORMA aqui evita que um valor estranho entre na base e evita que alguem use
// este campo como sitio para escrever o que quiser.
export function aparelhoValido(v) {
  return typeof v === 'string' && /^[0-9a-f]{32}\.\d{9,11}$/.test(v);
}
