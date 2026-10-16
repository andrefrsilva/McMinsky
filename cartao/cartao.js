/* Cartao pessoal McMinsky: partes 0, 1, 2 e 3.
 *
 * Tres coisas mandam neste ficheiro, e sao dele:
 *
 *  1. "super robusto e em que nenhuma ação de users burros possa causar erros". Logo: nada lanca
 *     excepcao para fora, cada botao fecha-se enquanto trabalha, e todo o estado que interessa
 *     sobrevive a fechar a pagina.
 *  2. "não pode ficar posicionado como chamada telefónica live porque ainda temos lag enorme".
 *     Logo: nunca se escreve "a ligar" nem "ao vivo". Deixa-se mensagem e espera-se resposta, como
 *     no correio de voz, que e exactamente o que isto e.
 *  3. "tem de ser super fácil para qualquer user, tipo avó ou criança". Logo: um botao de cada vez,
 *     do tamanho do polegar, e o ecra inteiro so com ele.
 *
 * E a regra legal que nao se negoceia: o codigo do aparelho SO nasce depois de a pessoa carregar em
 * aceitar, ou quando ela propria comeca uma mensagem (ai e estritamente necessario para lhe
 * entregarmos a resposta, que e a excepcao do artigo 5.º n.º 3 da Lei 41/2004).
 */
(function () {
  'use strict';

  var DADOS = {};
  try { DADOS = JSON.parse(document.getElementById('dados').textContent) || {}; } catch (e) { DADOS = {}; }

  var perfil = DADOS.perfil || {};
  var cartao = DADOS.cartao || {};
  var CHAVE_CONSENTIMENTO = 'mcminsky_gdpr_consent';
  var CHAVE_APARELHO = 'mcminsky_aparelho';
  var CHAVE_CONVERSA = 'mcminsky_conversa';
  var MAX_SEGUNDOS = 90;
  var AVISO_SEGUNDOS = 75;
  var MIN_MS = 900;

  var $ = function (id) { return document.getElementById(id); };
  var corpo = document.body;

  // --------------------------------------------------------------------- armazenamento seguro
  // Em navegacao privada, com o armazenamento bloqueado, ler ou escrever ATIRA. Se isto nao
  // estivesse embrulhado, o cartao ficava em branco para essas pessoas e nunca se saberia porque.
  function ler(chave) { try { return window.localStorage.getItem(chave); } catch (e) { return null; } }
  function guardar(chave, valor) { try { window.localStorage.setItem(chave, valor); return true; } catch (e) { return false; } }
  function esquecer(chave) { try { window.localStorage.removeItem(chave); } catch (e) {} }

  function codigoAparelho(criar) {
    var v = ler(CHAVE_APARELHO);
    if (v) return v;
    if (!criar) return null;
    var bytes = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    var hex = '';
    for (var i = 0; i < bytes.length; i++) hex += ('0' + bytes[i].toString(16)).slice(-2);
    // A data de nascimento vai dentro do proprio codigo: e assim que os 13 meses sao verificaveis
    // sem guardarmos mais nada, e e assim que ele NAO se renova a cada visita.
    v = hex + '.' + Math.floor(Date.now() / 1000);
    guardar(CHAVE_APARELHO, v);
    return v;
  }

  function aparelhoExpirado() {
    var v = ler(CHAVE_APARELHO);
    if (!v) return false;
    var nascido = Number(String(v).split('.')[1] || 0);
    if (!nascido) return true;
    return (Date.now() / 1000 - nascido) > 13 * 30.5 * 24 * 3600;
  }

  // --------------------------------------------------------------------- parte 0
  function escaparLinhas(texto) {
    var div = document.createElement('div');
    var partes = String(texto || '').split(/\n{2,}/);
    for (var i = 0; i < partes.length; i++) {
      var p = document.createElement('p');
      p.textContent = partes[i];
      div.appendChild(p);
    }
    return div;
  }

  function mostrarOuEsconder(elemento, condicao) {
    if (!elemento) return;
    if (condicao) elemento.removeAttribute('hidden');
    else elemento.setAttribute('hidden', '');
    if (!condicao) elemento.style.display = 'none';
  }

  function primeiroNome(nome) { return String(nome || '').trim().split(/\s+/)[0] || ''; }

  function pintarParte0() {
    var nome = perfil.nome || (DADOS.dono && DADOS.dono.nome) || 'McMinsky';
    document.title = nome + ' | McMinsky';
    $('nome').textContent = nome;
    $('papel').textContent = perfil.papel || '';
    if (perfil.foto) { $('foto').src = perfil.foto; $('foto').alt = 'Fotografia de ' + nome; }
    else { $('foto').parentNode.style.display = 'none'; }

    var bio = $('bio');
    bio.textContent = '';
    bio.appendChild(escaparLinhas(perfil.bio));

    var pn = primeiroNome(nome);
    $('primeiro-nome-1').textContent = pn;

    function contacto(id, href, detalhe) {
      var a = $(id);
      if (!href) { a.style.display = 'none'; return; }
      a.href = href;
      if (detalhe) $(detalhe.id).textContent = detalhe.texto;
    }

    var tel = perfil.telefone ? String(perfil.telefone).replace(/\D/g, '') : '';
    var wa = perfil.whatsapp ? String(perfil.whatsapp).replace(/\D/g, '') : '';
    var texto = 'Olá ' + pn + ', peguei no seu cartão.';

    contacto('b-whatsapp', wa ? 'https://wa.me/' + wa + '?text=' + encodeURIComponent(texto) : '',
      { id: 'd-whatsapp', texto: 'mensagem directa' });
    contacto('b-telegram', perfil.telegram ? 'https://t.me/' + perfil.telegram : '',
      { id: 'd-telegram', texto: '@' + (perfil.telegram || '') });
    contacto('b-telefone', tel ? 'tel:+' + tel : '',
      { id: 'd-telefone', texto: formatarTelefone(tel) });
    contacto('b-email', perfil.email ? 'mailto:' + perfil.email + '?subject=' + encodeURIComponent('Cartão McMinsky') : '',
      { id: 'd-email', texto: perfil.email || '' });
    contacto('b-linkedin', perfil.linkedin || '', null);
    contacto('b-mapa', perfil.mapa || '', { id: 'd-morada', texto: perfil.morada || '' });

    var gemeo = perfil.gemeo_nome || ('Duplo digital de ' + pn);
    var alvos = ['gemeo-nome', 'gemeo-nome-2', 'gemeo-nome-3', 'gemeo-nome-4'];
    for (var i = 0; i < alvos.length; i++) { if ($(alvos[i])) $(alvos[i]).textContent = gemeo; }
    $('gemeo-nota').textContent = perfil.gemeo_nota || '';

    if (!perfil.gemeo_activo) {
      $('zona-digital').style.display = 'none';
    }

    $('cartao-id').textContent = 'Cartão ' + (cartao.p || '?') + ' · ' + (cartao.a || '?');

    // O cartao de um especialista virtual inverte os lados: quem manda e a parte digital, e a parte
    // humana passa a ser o responsavel por ele. Pedido dele a 16 Out 2026: "quando for cartão com
    // qr code para um especialista virtual fica com esse contacto mas em que tem link do telegram
    // para a pessoa original, etc., e também a versão humana de falar com o responsável humano".
    if ((DADOS.dono || {}).tipo === 'especialista') {
      var digital = $('zona-digital');
      var humana = document.querySelector('.zona-humana');
      if (digital && humana && humana.parentNode) humana.parentNode.insertBefore(digital, humana);
      $('t-humana').textContent = 'Falar com quem responde por ' + pn;
      document.querySelector('.zona-humana .nota-zona').textContent =
        'A pessoa real por detrás deste especialista.';
      $('b-voz').querySelector('.sub-grande').textContent = 'Responde em poucos minutos, com voz';
    }
  }

  function formatarTelefone(digitos) {
    if (!digitos) return '';
    var d = digitos.replace(/^351/, '');
    if (d.length === 9) return d.slice(0, 3) + ' ' + d.slice(3, 6) + ' ' + d.slice(6);
    return '+' + digitos;
  }

  // --------------------------------------------------------------------- consentimento
  function estadoConsentimento() { return ler(CHAVE_CONSENTIMENTO); }

  function tratarConsentimento() {
    if (aparelhoExpirado()) {
      // Passados os 13 meses o codigo morre e nao renasce sozinho: volta a perguntar-se.
      esquecer(CHAVE_APARELHO);
      esquecer(CHAVE_CONSENTIMENTO);
    }
    var estado = estadoConsentimento();
    if (estado === 'accepted') {
      codigoAparelho(true);
      anunciarAparelho();
      return;
    }
    if (estado === 'rejected') return;
    var banner = $('consentimento');
    banner.removeAttribute('hidden');
    $('b-aceitar').addEventListener('click', function () {
      guardar(CHAVE_CONSENTIMENTO, 'accepted');
      banner.setAttribute('hidden', '');
      codigoAparelho(true);
      anunciarAparelho();
    });
    $('b-recusar').addEventListener('click', function () {
      guardar(CHAVE_CONSENTIMENTO, 'rejected');
      banner.setAttribute('hidden', '');
    });
  }

  // Diz ao servidor qual o aparelho desta visita. Sem isto a visita fica gravada na mesma, apenas
  // sem saber se e a mesma pessoa de ontem, que e exactamente o que acontece a quem recusa.
  function anunciarAparelho() {
    var v = codigoAparelho(false);
    if (!v || !DADOS.ficha) return;
    try {
      fetch('/api/visita/dispositivo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ficha: DADOS.ficha, aparelho: v }),
        keepalive: true,
      }).catch(function () {});
    } catch (e) {}
  }

  // --------------------------------------------------------------------- palco (partes 1 a 3)
  var palco = $('palco');
  var passos = { 1: $('parte1'), '1b': $('parte1b'), 2: $('parte2'), 3: $('parte3') };
  var passoActual = null;

  function abrirPalco(qual) {
    palco.removeAttribute('hidden');
    try {
      if (palco.requestFullscreen) palco.requestFullscreen().catch(function () {});
      else if (palco.webkitRequestFullscreen) palco.webkitRequestFullscreen();
    } catch (e) {}
    irPara(qual);
  }

  function fecharPalco() {
    pararTudo();
    palco.setAttribute('hidden', '');
    corpo.setAttribute('data-parte', '0');
    try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {}); } catch (e) {}
    mostrarConversaGuardada();
  }

  function irPara(qual) {
    for (var k in passos) { if (passos[k]) passos[k].setAttribute('hidden', ''); }
    if (passos[qual]) passos[qual].removeAttribute('hidden');
    passoActual = qual;
    corpo.setAttribute('data-parte', String(qual).charAt(0));
  }

  // --------------------------------------------------------------------- parte 1: gravar
  var media = null;      // MediaRecorder
  var fluxo = null;      // MediaStream
  var pedacos = [];
  var contexto = null;   // AudioContext
  var analisador = null;
  var desenho = 0;
  var inicio = 0;
  var cronometro = 0;
  var niveis = [];

  function tipoSuportado() {
    var candidatos = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4', ''];
    for (var i = 0; i < candidatos.length; i++) {
      try {
        if (!candidatos[i]) return '';
        if (window.MediaRecorder && MediaRecorder.isTypeSupported(candidatos[i])) return candidatos[i];
      } catch (e) {}
    }
    return '';
  }

  function erroMicro(mensagem) {
    var caixa = $('erro-micro');
    caixa.textContent = mensagem;
    caixa.removeAttribute('hidden');
  }

  function limparErroMicro() { $('erro-micro').setAttribute('hidden', ''); }

  async function comecarGravacao() {
    limparErroMicro();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      erroMicro('Este browser não deixa gravar som. Use o botão de escrever, aqui em baixo.');
      return;
    }
    try {
      fluxo = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e) {
      erroMicro(e && e.name === 'NotAllowedError'
        ? 'Não nos deixou usar o microfone. Pode autorizar nas definições do browser, ou escrever a mensagem.'
        : 'Não consegui abrir o microfone. Use o botão de escrever, aqui em baixo.');
      return;
    }

    pedacos = [];
    niveis = [];
    var tipo = tipoSuportado();
    try { media = tipo ? new MediaRecorder(fluxo, { mimeType: tipo }) : new MediaRecorder(fluxo); }
    catch (e) { media = new MediaRecorder(fluxo); }

    media.ondataavailable = function (ev) { if (ev.data && ev.data.size) pedacos.push(ev.data); };
    media.onstop = function () { enviarGravacao(); };
    media.onerror = function () { erroMicro('A gravação falhou a meio. Tente outra vez.'); pararGravacao(true); };

    try {
      contexto = new (window.AudioContext || window.webkitAudioContext)();
      var fonte = contexto.createMediaStreamSource(fluxo);
      analisador = contexto.createAnalyser();
      analisador.fftSize = 512;
      analisador.smoothingTimeConstant = 0.75;
      fonte.connect(analisador);
    } catch (e) { analisador = null; }

    media.start();
    inicio = Date.now();
    corpo.setAttribute('data-gravando', '1');
    $('micro-rotulo').textContent = 'Parar';
    $('p1-titulo').textContent = 'A ouvir';
    $('p1-sub').textContent = 'Fale à vontade. Toque no círculo, ou no botão, quando acabar.';
    $('cronometro').removeAttribute('hidden');
    $('b-parar').removeAttribute('hidden');
    $('b-escrever-2').setAttribute('hidden', '');
    animarAnel();
    cronometro = window.setInterval(tiqueCronometro, 200);
  }

  function tiqueCronometro() {
    var s = (Date.now() - inicio) / 1000;
    var m = Math.floor(s / 60);
    var r = Math.floor(s % 60);
    $('cronometro').textContent = m + ':' + (r < 10 ? '0' : '') + r;
    var limite = $('limite');
    if (s >= AVISO_SEGUNDOS) {
      limite.removeAttribute('hidden');
      limite.textContent = 'Faltam ' + Math.max(0, Math.ceil(MAX_SEGUNDOS - s)) + ' segundos.';
    }
    if (s >= MAX_SEGUNDOS) pararGravacao(false);
  }

  function pararGravacao(cancelar) {
    window.clearInterval(cronometro);
    cronometro = 0;
    window.cancelAnimationFrame(desenho);
    corpo.removeAttribute('data-gravando');
    $('micro-rotulo').textContent = 'Falar';
    $('limite').setAttribute('hidden', '');
    if (cancelar && media) { try { media.onstop = null; } catch (e) {} }
    try { if (media && media.state !== 'inactive') media.stop(); } catch (e) {}
    try { if (fluxo) fluxo.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    try { if (contexto && contexto.close) contexto.close(); } catch (e) {}
    contexto = null; analisador = null; fluxo = null;
  }

  function pararTudo() {
    if (corpo.getAttribute('data-gravando')) pararGravacao(true);
    pararPolling();
    pararAnimacao();
  }

  // O anel: feedback do volume em tempo real. E uma coroa de barras, sem brilhos nem particulas,
  // porque o pedido dele foi explicito, "nada tipo como naqueles filmes de sci fi baratos".
  function animarAnel() {
    var tela = $('anel');
    var ctx = tela.getContext('2d');
    var dados = analisador ? new Uint8Array(analisador.frequencyBinCount) : null;
    var fase = 0;

    function quadro() {
      desenho = window.requestAnimationFrame(quadro);
      var l = tela.width, c = l / 2, raio = l * 0.36;
      ctx.clearRect(0, 0, l, l);

      var volume = 0;
      if (analisador && dados) {
        analisador.getByteFrequencyData(dados);
        var soma = 0;
        for (var i = 0; i < dados.length; i++) soma += dados[i];
        volume = Math.min(1, (soma / dados.length) / 110);
      }
      if (niveis.length < 400 && (niveis.length === 0 || Date.now() - inicio > niveis.length * 150)) {
        niveis.push(volume);
      }

      fase += 0.012;
      var barras = 72;
      for (var b = 0; b < barras; b++) {
        var ang = (b / barras) * Math.PI * 2 - Math.PI / 2;
        var onda = 0.5 + 0.5 * Math.sin(fase * 2 + b * 0.5);
        var comp = raio * (0.07 + volume * 0.3 * onda + 0.02 * onda);
        var x1 = c + Math.cos(ang) * raio, y1 = c + Math.sin(ang) * raio;
        var x2 = c + Math.cos(ang) * (raio + comp), y2 = c + Math.sin(ang) * (raio + comp);
        ctx.strokeStyle = 'rgba(127,178,255,' + (0.22 + volume * 0.55) + ')';
        ctx.lineWidth = l * 0.008;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.lineWidth = l * 0.004;
      ctx.beginPath(); ctx.arc(c, c, raio, 0, Math.PI * 2); ctx.stroke();
    }
    quadro();
  }

  // --------------------------------------------------------------------- envio
  var aEnviar = false;

  function duracaoGravada() { return Math.max(0, Date.now() - inicio); }

  async function enviarGravacao() {
    var ms = duracaoGravada();
    var bocado = new Blob(pedacos, { type: (pedacos[0] && pedacos[0].type) || 'audio/webm' });
    pedacos = [];
    if (!bocado.size || ms < MIN_MS) {
      irPara(1);
      $('p1-titulo').textContent = 'Ficou curto demais';
      $('p1-sub').textContent = 'Toque e fale pelo menos um segundo.';
      $('cronometro').setAttribute('hidden', '');
      $('b-parar').setAttribute('hidden', '');
      $('b-escrever-2').removeAttribute('hidden');
      return;
    }
    await enviar({ audio: bocado, ms: ms });
  }

  async function enviar(carga) {
    if (aEnviar) return;
    aEnviar = true;
    irPara(2);
    comecarAnimacaoFila();

    var v = codigoAparelho(true);
    var corpoEnvio = new FormData();
    corpoEnvio.append('ficha', DADOS.ficha || '');
    corpoEnvio.append('aparelho', v || '');
    if (carga.audio) { corpoEnvio.append('audio', carga.audio, 'mensagem'); corpoEnvio.append('ms', String(carga.ms || 0)); }
    if (carga.texto) corpoEnvio.append('texto', carga.texto);

    try {
      var r = await fetch('/api/voz/mensagem', { method: 'POST', body: corpoEnvio });
      var j = await r.json();
      if (!j.ok) {
        aEnviar = false;
        falhaEnvio(j.erro || 'nao_deu', carga);
        return;
      }
      guardar(CHAVE_CONVERSA, String(j.conversa));
      if (carga.audio) guardarCopiaLocal(j.mensagem, carga.audio);
      aEnviar = false;
      chegouAFila(j);
    } catch (e) {
      aEnviar = false;
      await guardarNaMala(carga);
      semRede();
    }
  }

  function falhaEnvio(codigo, carga) {
    pararAnimacao();
    irPara(2);
    $('p2-selo').textContent = 'Não deu';
    $('fila').setAttribute('hidden', '');
    if (codigo === 'limite_dia' || codigo === 'limite_tempo') {
      $('p2-titulo').textContent = 'Por hoje chega';
      $('p2-sub').textContent = 'Já deixou bastantes mensagens hoje. Volte amanhã, ou fale directamente com a pessoa real pelos botões do cartão.';
    } else if (codigo === 'muito_grande' || codigo === 'muito_longa') {
      $('p2-titulo').textContent = 'Mensagem longa demais';
      $('p2-sub').textContent = 'Tente outra vez, mais curta.';
    } else {
      $('p2-titulo').textContent = 'Algo correu mal';
      $('p2-sub').textContent = 'Tente outra vez daqui a pouco.';
    }
    mostrarVoltar();
  }

  function semRede() {
    pararAnimacao();
    irPara(2);
    $('p2-selo').textContent = 'Guardado neste aparelho';
    $('p2-titulo').textContent = 'Sem rede, por agora';
    $('p2-sub').textContent = 'A sua mensagem ficou guardada aqui e segue sozinha assim que houver ligação. Pode fechar.';
    $('fila').setAttribute('hidden', '');
    mostrarVoltar();
  }

  function mostrarVoltar() {
    var b = $('b-ouvir-enviado');
    b.textContent = 'Voltar';
    b.removeAttribute('hidden');
    b.onclick = function () { irPara(1); repor1(); };
  }

  function repor1() {
    $('p1-titulo').textContent = 'Toque para falar';
    $('p1-sub').textContent = 'Diga o que quiser. Depois toque outra vez para enviar.';
    $('cronometro').setAttribute('hidden', '');
    $('cronometro').textContent = '0:00';
    $('b-parar').setAttribute('hidden', '');
    $('b-escrever-2').removeAttribute('hidden');
    limparErroMicro();
  }

  // ------------------------------------------------------------ mala de fora de rede (offline)
  // Requisito dele: "tem de dar para não precisar de rede". A mensagem fica no aparelho, numa base
  // local, e sai sozinha quando a ligacao voltar, mesmo que a pessoa tenha fechado a pagina.
  function mala() { return (window.idbKeyval || null); }

  async function guardarNaMala(carga) {
    var kv = mala();
    if (!kv) return;
    try {
      var lista = (await kv.get('mcminsky_mala')) || [];
      lista.push({
        ficha: DADOS.ficha, aparelho: codigoAparelho(true),
        audio: carga.audio || null, ms: carga.ms || 0, texto: carga.texto || null, quando: Date.now(),
      });
      await kv.set('mcminsky_mala', lista.slice(-5));
    } catch (e) {}
  }

  async function esvaziarMala() {
    var kv = mala();
    if (!kv || !navigator.onLine) return;
    var lista = [];
    try { lista = (await kv.get('mcminsky_mala')) || []; } catch (e) { return; }
    if (!lista.length) return;
    var sobram = [];
    for (var i = 0; i < lista.length; i++) {
      var item = lista[i];
      var fd = new FormData();
      fd.append('ficha', item.ficha || '');
      fd.append('aparelho', item.aparelho || '');
      if (item.audio) { fd.append('audio', item.audio, 'mensagem'); fd.append('ms', String(item.ms || 0)); }
      if (item.texto) fd.append('texto', item.texto);
      try {
        var r = await fetch('/api/voz/mensagem', { method: 'POST', body: fd });
        var j = await r.json();
        if (!j.ok && j.erro !== 'limite_dia') sobram.push(item);
        else if (j.ok) guardar(CHAVE_CONVERSA, String(j.conversa));
      } catch (e) { sobram.push(item); }
    }
    try { await kv.set('mcminsky_mala', sobram); } catch (e) {}
  }

  // Guarda no aparelho uma copia do que foi enviado, para a pessoa poder reouvir mesmo sem rede.
  async function guardarCopiaLocal(idMensagem, bocado) {
    var kv = mala();
    if (!kv || !idMensagem) return;
    try { await kv.set('mcminsky_audio_' + idMensagem, bocado); } catch (e) {}
  }
  async function copiaLocal(idMensagem) {
    var kv = mala();
    if (!kv) return null;
    try { return (await kv.get('mcminsky_audio_' + idMensagem)) || null; } catch (e) { return null; }
  }

  // --------------------------------------------------------------------- parte 2: a fila
  var filaTimer = 0;
  var filaValor = 0;
  var animacaoCorre = 0;

  function comecarAnimacaoFila() {
    $('p2-selo').textContent = 'A enviar';
    $('p2-titulo').textContent = 'A caminho';
    $('p2-sub').textContent = 'Um instante.';
    $('fila').setAttribute('hidden', '');
    $('b-ouvir-enviado').setAttribute('hidden', '');
  }

  function chegouAFila(resposta) {
    $('p2-selo').textContent = 'Entregue';
    $('p2-titulo').textContent = 'Está na fila';
    $('p2-sub').textContent = 'Fica aqui a ver, ou feche e volte depois: a resposta não se perde.';
    filaValor = Math.max(1, Number(resposta.posicao) || 3);
    $('fila-numero').textContent = String(filaValor);
    $('fila').removeAttribute('hidden');
    descerFila();
    comecarPolling(resposta.conversa, resposta.mensagem);
  }

  // O numero desce a um ritmo irregular de proposito: um contador certinho parece falso, e este
  // numero e uma estimativa, nao uma promessa. Nunca chega a zero sozinho, so quando a resposta
  // existe mesmo.
  function descerFila() {
    window.clearTimeout(filaTimer);
    if (filaValor <= 1) return;
    filaTimer = window.setTimeout(function () {
      filaValor -= 1;
      $('fila-numero').textContent = String(filaValor);
      descerFila();
    }, 2600 + Math.random() * 4200);
  }

  var polling = 0;
  var pollingDesde = 0;
  var pollingIntervalo = 3500;

  function comecarPolling(conversa, mensagem) {
    pararPolling();
    pollingDesde = Date.now();
    pollingIntervalo = 3500;
    var tique = async function () {
      var estado = await verConversa(conversa);
      if (!estado) { polling = window.setTimeout(tique, 8000); return; }
      var resposta = null;
      for (var i = 0; i < estado.mensagens.length; i++) {
        var m = estado.mensagens[i];
        if (m.papel !== 'visitante' && (!mensagem || m.resposta_de === mensagem || m.id > mensagem)) resposta = m;
      }
      if (resposta) {
        window.clearTimeout(filaTimer);
        await atender(estado);
        return;
      }
      // Ao fim de um minuto espaca-se: cada volta e uma leitura na base, e ninguem fica a olhar
      // para o telefone dez minutos seguidos.
      var passou = Date.now() - pollingDesde;
      if (passou > 60000) pollingIntervalo = 9000;
      if (passou > 240000) pollingIntervalo = 20000;
      if (passou > 900000) { pollingLongo(conversa); return; }
      polling = window.setTimeout(tique, pollingIntervalo);
    };
    polling = window.setTimeout(tique, 2500);
  }

  function pollingLongo(conversa) {
    $('p2-selo').textContent = 'Em espera';
    $('p2-titulo').textContent = 'Está a demorar mais do que o costume';
    $('p2-sub').textContent = 'Pode fechar. Quando voltar a abrir este cartão a resposta estará aqui.';
    $('fila').setAttribute('hidden', '');
  }

  function pararPolling() { window.clearTimeout(polling); polling = 0; window.clearTimeout(filaTimer); }

  async function verConversa(conversa) {
    try {
      var r = await fetch('/api/voz/conversa?ficha=' + encodeURIComponent(DADOS.ficha || '')
        + '&aparelho=' + encodeURIComponent(codigoAparelho(false) || '')
        + '&conversa=' + encodeURIComponent(conversa || ''));
      var j = await r.json();
      return j && j.ok ? j : null;
    } catch (e) { return null; }
  }

  // A animacao de atendimento: dois segundos, e so dois. Arcos concentricos que se alinham e um
  // tracado que se fecha. Monocromatico, sem particulas, sem brilhos a pulsar.
  function animacaoAtendimento() {
    return new Promise(function (resolve) {
      var tela = $('animacao');
      tela.classList.add('ligada');
      var ctx = tela.getContext('2d');
      var t0 = performance.now();
      var DUR = 1900;

      function quadro(agora) {
        var t = Math.min(1, (agora - t0) / DUR);
        var e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // suave nos dois extremos
        var l = tela.width, c = l / 2;
        ctx.clearRect(0, 0, l, l);

        for (var k = 0; k < 5; k++) {
          var raio = l * (0.14 + k * 0.065);
          var inicioA = -Math.PI / 2 + (1 - e) * (k % 2 ? -1 : 1) * Math.PI * (1.1 - k * 0.12);
          var arco = Math.PI * 2 * e * (0.35 + k * 0.1);
          ctx.strokeStyle = 'rgba(190,214,255,' + (0.14 + 0.5 * e * (1 - k * 0.12)) + ')';
          ctx.lineWidth = l * 0.0055;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(c, c, raio, inicioA, inicioA + arco);
          ctx.stroke();
        }

        var pontos = 48;
        ctx.beginPath();
        for (var i = 0; i <= pontos; i++) {
          var x = (i / pontos) * l;
          var amp = l * 0.055 * Math.sin(Math.PI * e) * Math.sin(i * 0.55 + e * 7);
          var y = c + amp * (1 - Math.abs(i / pontos - 0.5) * 1.6);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * Math.sin(Math.PI * e)) + ')';
        ctx.lineWidth = l * 0.004;
        ctx.stroke();

        if (t < 1) animacaoCorre = window.requestAnimationFrame(quadro);
        else { tela.classList.remove('ligada'); ctx.clearRect(0, 0, l, l); resolve(); }
      }
      animacaoCorre = window.requestAnimationFrame(quadro);
    });
  }

  function pararAnimacao() {
    window.cancelAnimationFrame(animacaoCorre);
    var tela = $('animacao');
    if (tela) { tela.classList.remove('ligada'); try { tela.getContext('2d').clearRect(0, 0, tela.width, tela.height); } catch (e) {} }
  }

  async function atender(estado) {
    pararPolling();
    $('p2-selo').textContent = 'A sua vez';
    $('p2-titulo').textContent = '';
    $('p2-sub').textContent = '';
    $('fila').setAttribute('hidden', '');
    await animacaoAtendimento();
    pintarFio(estado);
    irPara(3);
    avisar(estado);
  }

  // --------------------------------------------------------------------- parte 3: o fio
  function pintarFio(estado) {
    var fio = $('fio');
    fio.textContent = '';
    var lista = (estado && estado.mensagens) || [];
    for (var i = 0; i < lista.length; i++) fio.appendChild(bolhaDe(lista[i]));
    fio.scrollTop = fio.scrollHeight;
  }

  function bolhaDe(m) {
    var div = document.createElement('div');
    div.className = 'bolha bolha-' + m.papel + (m.estado === 'pendente' && m.papel !== 'visitante' ? ' bolha-pendente' : '');
    var quem = document.createElement('span');
    quem.className = 'quem';
    quem.textContent = m.papel === 'visitante' ? 'Você'
      : (m.papel === 'humano' ? (perfil.nome || 'A pessoa real') : ((perfil.gemeo_nome || 'Duplo digital') + ' · IA'));
    div.appendChild(quem);

    if (m.texto) {
      var p = document.createElement('p');
      p.textContent = m.texto;
      div.appendChild(p);
    } else if (m.papel === 'visitante') {
      var p2 = document.createElement('p');
      p2.textContent = 'Mensagem de voz';
      p2.style.opacity = '0.7';
      div.appendChild(p2);
    }

    if (m.audio) div.appendChild(leitorDe(m));
    else if (m.texto && m.papel !== 'visitante') div.appendChild(leitorDoBrowser(m.texto));
    return div;
  }

  // A terceira forma de ouvir, da lista dele: "voz de três formas: webkit nativo do browser, voz de
  // qualidade mas open source da microsoft de modelo local, voz clonada do modelo que temos local".
  // As duas primeiras chegam ja em audio feito do lado de quem atende. Esta e a do proprio aparelho,
  // e serve de rede de seguranca: uma resposta escrita continua a poder ser ouvida, mesmo sem rede.
  function leitorDoBrowser(texto) {
    var caixa = document.createElement('div');
    caixa.className = 'leitor-barra';
    if (!('speechSynthesis' in window)) return caixa;

    var botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'leitor-tocar';
    botao.setAttribute('aria-label', 'Ouvir a resposta');
    botao.textContent = '\u25B6';
    var nota = document.createElement('span');
    nota.className = 'leitor-tempo';
    nota.textContent = 'ouvir, voz do aparelho';

    botao.addEventListener('click', function () {
      try {
        if (window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); botao.textContent = '\u25B6'; return; }
        var fala = new SpeechSynthesisUtterance(texto);
        fala.lang = 'pt-PT';
        fala.rate = 1;
        var vozes = window.speechSynthesis.getVoices() || [];
        for (var i = 0; i < vozes.length; i++) {
          if (/pt[-_]PT/i.test(vozes[i].lang)) { fala.voice = vozes[i]; break; }
        }
        fala.onend = function () { botao.textContent = '\u25B6'; };
        botao.textContent = '\u23F8';
        window.speechSynthesis.speak(fala);
      } catch (e) { botao.textContent = '\u25B6'; }
    });

    caixa.appendChild(botao);
    caixa.appendChild(nota);
    return caixa;
  }

  // Leitor de audio. Tenta a onda, e se a biblioteca nao carregar ou o formato nao se deixar ler,
  // cai num leitor normal do browser. O importante e nunca ficar sem forma de ouvir.
  function leitorDe(m) {
    var caixa = document.createElement('div');
    caixa.className = 'leitor';
    var url = '/api/voz/audio?ficha=' + encodeURIComponent(DADOS.ficha || '')
      + '&aparelho=' + encodeURIComponent(codigoAparelho(false) || '')
      + '&mensagem=' + encodeURIComponent(m.id);

    if (window.WaveSurfer) {
      try {
        var onda = document.createElement('div');
        onda.className = 'leitor-onda';
        caixa.appendChild(onda);
        var barra = document.createElement('div');
        barra.className = 'leitor-barra';
        var tocar = document.createElement('button');
        tocar.type = 'button';
        tocar.className = 'leitor-tocar';
        tocar.setAttribute('aria-label', 'Ouvir');
        tocar.textContent = '▶';
        var tempo = document.createElement('span');
        tempo.className = 'leitor-tempo';
        tempo.textContent = '0:00';
        barra.appendChild(tocar); barra.appendChild(tempo);
        caixa.appendChild(barra);

        var claro = m.papel === 'humano';
        var ws = window.WaveSurfer.create({
          container: onda,
          height: 42,
          waveColor: claro ? 'rgba(18,16,16,0.25)' : 'rgba(255,255,255,0.28)',
          progressColor: claro ? '#121010' : '#bcd6ff',
          cursorWidth: 0,
          barWidth: 2,
          barGap: 2,
          barRadius: 2,
          url: url,
        });
        tocar.addEventListener('click', function () { try { ws.playPause(); } catch (e) {} });
        ws.on('play', function () { tocar.textContent = '⏸'; });
        ws.on('pause', function () { tocar.textContent = '▶'; });
        ws.on('finish', function () { tocar.textContent = '▶'; });
        ws.on('timeupdate', function (s) {
          var r = Math.floor(s % 60);
          tempo.textContent = Math.floor(s / 60) + ':' + (r < 10 ? '0' : '') + r;
        });
        ws.on('error', function () { caixa.textContent = ''; caixa.appendChild(leitorSimples(url)); });
        return caixa;
      } catch (e) { caixa.textContent = ''; }
    }
    caixa.appendChild(leitorSimples(url));
    return caixa;
  }

  function leitorSimples(url) {
    var a = document.createElement('audio');
    a.controls = true;
    a.preload = 'none';
    a.src = url;
    a.style.width = '100%';
    return a;
  }

  // Aviso quando a resposta chega com a pagina de lado. Pede-se licenca uma unica vez, e so depois
  // de a pessoa ja ter enviado alguma coisa: pedir antes disso e o que toda a gente recusa.
  function avisar(estado) {
    try {
      if (!('Notification' in window)) return;
      if (document.visibilityState === 'visible') return;
      if (Notification.permission !== 'granted') return;
      var ultima = estado.mensagens[estado.mensagens.length - 1];
      new Notification((perfil.gemeo_nome || 'Resposta') + ' respondeu', {
        body: (ultima && ultima.texto ? String(ultima.texto).slice(0, 110) : 'Toque para ouvir.'),
        tag: 'mcminsky-cartao',
      });
    } catch (e) {}
  }

  function pedirAvisoUmaVez() {
    try {
      if (!('Notification' in window) || Notification.permission !== 'default') return;
      Notification.requestPermission().catch(function () {});
    } catch (e) {}
  }

  // --------------------------------------------------------------------- conversa ja existente
  async function mostrarConversaGuardada() {
    var conversa = ler(CHAVE_CONVERSA);
    if (!conversa || !codigoAparelho(false)) return;
    var estado = await verConversa(conversa);
    if (!estado || !estado.mensagens.length) return;
    var caixa = $('conversas-antigas');
    var porResponder = 0;
    for (var i = 0; i < estado.mensagens.length; i++) {
      if (estado.mensagens[i].papel === 'visitante' && estado.mensagens[i].estado !== 'respondida') porResponder++;
    }
    $('resumo-conversa').textContent = estado.mensagens.length + (estado.mensagens.length === 1 ? ' mensagem' : ' mensagens')
      + (porResponder ? ', ' + porResponder + ' à espera de resposta' : '');
    caixa.removeAttribute('hidden');
    $('b-abrir-conversa').onclick = function () {
      pintarFio(estado);
      abrirPalco(3);
    };
  }

  // --------------------------------------------------------------------- ligacoes dos botoes
  function ligar() {
    $('b-voz').addEventListener('click', function () { abrirPalco(1); repor1(); pedirAvisoUmaVez(); });
    $('b-escrever').addEventListener('click', function () { abrirPalco('1b'); pedirAvisoUmaVez(); });
    $('b-escrever-2').addEventListener('click', function () { irPara('1b'); });
    $('b-voltar-voz').addEventListener('click', function () { irPara(1); repor1(); });
    $('b-fechar').addEventListener('click', fecharPalco);

    var gravar = function () {
      if (corpo.getAttribute('data-gravando')) pararGravacao(false);
      else comecarGravacao();
    };
    $('b-gravar').addEventListener('click', gravar);
    $('b-parar').addEventListener('click', function () { pararGravacao(false); });

    var texto = $('texto');
    texto.addEventListener('input', function () {
      $('contador-texto').textContent = texto.value.length + ' de 1200';
      $('b-enviar-texto').disabled = texto.value.trim().length < 2;
    });
    $('b-enviar-texto').addEventListener('click', function () {
      var t = texto.value.trim();
      if (t.length < 2) return;
      $('b-enviar-texto').disabled = true;
      texto.value = '';
      $('contador-texto').textContent = '0 de 1200';
      enviar({ texto: t });
    });

    $('b-nova').addEventListener('click', function () { irPara(1); repor1(); });
    $('b-humano').addEventListener('click', async function () {
      var b = $('b-humano');
      b.disabled = true;
      b.textContent = 'Avisado. Ele vê isto e responde.';
      try {
        await fetch('/api/voz/humano', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ficha: DADOS.ficha, aparelho: codigoAparelho(false), conversa: ler(CHAVE_CONVERSA) }),
        });
      } catch (e) {}
    });

    $('b-esquecer').addEventListener('click', function () {
      esquecer(CHAVE_APARELHO); esquecer(CHAVE_CONSENTIMENTO); esquecer(CHAVE_CONVERSA);
      $('b-esquecer').textContent = 'Esquecido.';
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !palco.hasAttribute('hidden')) fecharPalco();
    });
    window.addEventListener('online', esvaziarMala);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') esvaziarMala();
    });
  }

  // --------------------------------------------------------------------- arranque
  try {
    pintarParte0();
    ligar();
    tratarConsentimento();
    window.setTimeout(function () { esvaziarMala(); }, 1200);
    window.setTimeout(function () { mostrarConversaGuardada(); }, 300);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/c/sw.js').catch(function () {});
    }
  } catch (e) {
    // Nunca deixar o cartao em branco por causa de um erro nosso: os contactos sao o essencial.
    if (window.console) console.error(e);
  }
})();
