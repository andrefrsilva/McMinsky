/* Cartao pessoal McMinsky: partes 0, 1, 2 e 3.
 *
 * Tres coisas mandam neste ficheiro, e sao dele:
 *
 *  1. "super robusto e em que nenhuma ação de users burros possa causar erros". Logo: nada lanca
 *     excepcao para fora, cada botao fecha-se enquanto trabalha, e todo o estado que interessa
 *     sobrevive a fechar a pagina.
 *  2. "não pode ficar posicionado como chamada telefónica live porque ainda temos lag enorme".
 *     Logo: nunca se escreve "a ligar" nem "ao vivo". Deixa-se mensagem e espera-se resposta.
 *  3. "tem de ser super fácil para qualquer user, tipo avó ou criança". Logo: um botao de cada vez,
 *     do tamanho do polegar, e o ecra inteiro so com ele.
 *
 * E a regra que ele repetiu a 16 Out 2026: "garante mais uma vez que só funciona quando a pessoa
 * tiver aceite aquilo de gravar a propria voz". O botao de falar NAO abre sem aceitacao: abre o
 * aviso. Sem aceitacao nao ha identificador, e sem identificador nao ha forma de lhe entregar a
 * resposta, logo nao ha servico nenhum para dar.
 */
(function () {
  'use strict';

  var DADOS = {};
  try { DADOS = JSON.parse(document.getElementById('dados').textContent) || {}; } catch (e) { DADOS = {}; }

  var perfilBase = DADOS.perfil || {};
  var cartao = DADOS.cartao || {};
  var CHAVE_CONSENTIMENTO = 'mcminsky_gdpr_consent';
  var CHAVE_APARELHO = 'mcminsky_aparelho';
  var CHAVE_CONVERSA = 'mcminsky_conversa';
  var CHAVE_LINGUA = 'mcminsky_lang';
  var MAX_SEGUNDOS = 90;
  var AVISO_SEGUNDOS = 75;
  var MIN_MS = 900;

  var $ = function (id) { return document.getElementById(id); };
  var corpo = document.body;

  // ------------------------------------------------------------------ linguas
  // Acrescentar uma lingua e acrescentar uma chave aqui e uma linha na tabela do perfil. Mais nada.
  var TEXTOS = {
    pt: {
      partilhar: 'Partilhar este cartão',
      copiado: 'Ligação copiada',
      pessoa_real: 'Pessoa real',
      falar_com: 'Falar com',
      responde_quando_puder: 'Responde quando puder, como qualquer pessoa.',
      responsavel_por: 'Falar com quem responde por',
      pessoa_por_detras: 'A pessoa real por detrás deste especialista.',
      mensagem_directa: 'mensagem directa',
      telefonar: 'Telefonar',
      perfil_profissional: 'perfil profissional',
      estudio: 'Estúdio',
      gerado_ia: 'Gerado por inteligência artificial',
      deixar_voz: 'Deixar mensagem de voz',
      responde_voz: 'Responde com a voz dele, em poucos minutos',
      prefiro_escrever: 'Prefiro escrever',
      aviso_voz: 'A voz da resposta é sintética e a conversa fica guardada para poder ouvir outra vez.',
      sua_conversa: 'A sua conversa',
      abrir_conversa: 'Abrir conversa',
      esquecer: 'Esquecer este aparelho',
      esquecido: 'Esquecido.',
      mensagem_para: 'Mensagem para',
      conversa_com: 'Conversa com',
      toque_falar: 'Toque para falar',
      diga_o_que_quiser: 'Diga o que quiser. Depois toque outra vez para enviar.',
      falar: 'Falar',
      parar: 'Parar',
      parar_enviar: 'Parar e enviar',
      escrever_em_vez: 'Escrever em vez de falar',
      escreva_mensagem: 'Escreva a sua mensagem',
      o_que_perguntar: 'O que gostaria de perguntar?',
      enviar: 'Enviar',
      prefiro_falar: 'Prefiro falar',
      de_1200: 'de 1200',
      a_ouvir: 'A ouvir',
      fale_a_vontade: 'Fale à vontade. Toque no círculo, ou no botão, quando acabar.',
      faltam_segundos: 'Faltam {n} segundos.',
      curto_demais: 'Ficou curto demais',
      toque_e_fale: 'Toque e fale pelo menos um segundo.',
      a_enviar: 'A enviar',
      a_caminho: 'A caminho',
      um_instante: 'Um instante.',
      entregue: 'Entregue',
      esta_na_fila: 'Está na fila',
      fica_a_ver: 'Fica aqui a ver, ou feche e volte depois: a resposta não se perde.',
      a_sua_frente: 'à sua frente',
      a_sua_vez: 'A sua vez',
      ouvir_enviei: 'Ouvir o que enviei',
      voltar: 'Voltar',
      nao_deu: 'Não deu',
      algo_correu_mal: 'Algo correu mal',
      tente_outra_vez: 'Tente outra vez daqui a pouco.',
      longa_demais: 'Mensagem longa demais',
      mais_curta: 'Tente outra vez, mais curta.',
      guardado_aparelho: 'Guardado neste aparelho',
      sem_rede: 'Sem rede, por agora',
      segue_sozinha: 'A sua mensagem ficou guardada aqui e segue sozinha assim que houver ligação. Pode fechar.',
      em_espera: 'Em espera',
      a_demorar: 'Está a demorar mais do que o costume',
      volte_depois: 'Pode fechar. Quando voltar a abrir este cartão a resposta estará aqui.',
      nova_mensagem: 'Nova mensagem',
      falar_pessoa_real: 'Quero falar com a pessoa real',
      avisado: 'Avisado. Ele vê isto e responde.',
      voce: 'Você',
      pessoa_real_curto: 'A pessoa real',
      duplo_digital: 'Duplo digital',
      mensagem_de_voz: 'Mensagem de voz',
      ouvir: 'Ouvir',
      ouvir_voz_aparelho: 'ouvir, voz do aparelho',
      a_tocar: 'a tocar, toque para parar',
      sem_microfone: 'Este browser não deixa gravar som. Use o botão de escrever, aqui em baixo.',
      microfone_negado: 'Não nos deixou usar o microfone. Pode autorizar nas definições do browser, ou escrever a mensagem.',
      microfone_falhou: 'Não consegui abrir o microfone. Use o botão de escrever, aqui em baixo.',
      gravacao_falhou: 'A gravação falhou a meio. Tente outra vez.',
      mensagens: 'mensagens',
      mensagem: 'mensagem',
      a_espera_resposta: 'à espera de resposta',
      texto_consentimento: 'Para lhe responder, e para perceber quantas pessoas diferentes abrem este cartão, guardamos neste aparelho um código aleatório. Não guardamos o seu endereço de rede.',
      texto_consentimento_voz: 'Para lhe deixar deixar uma mensagem e depois lhe entregar a resposta, precisamos de guardar neste aparelho um código aleatório. Sem isso não há forma de saber a quem pertence a resposta.',
      nao_obrigado: 'Não, obrigado',
      aceito: 'Aceito',
      cartao: 'Cartão',
      vantagens: [
        ['Às 3 da manhã', ' também atende.'],
        ['Fala a sua língua', ', seja ela qual for.'],
        ['Explica dez vezes', ' sem suspirar.'],
        ['Não interrompe', ' e nunca diz que está em reunião.'],
      ],
    },
    en: {
      partilhar: 'Share this card',
      copiado: 'Link copied',
      pessoa_real: 'Real person',
      falar_com: 'Talk to',
      responde_quando_puder: 'Answers when he can, like any person.',
      responsavel_por: 'Talk to the person behind',
      pessoa_por_detras: 'The real person behind this specialist.',
      mensagem_directa: 'direct message',
      telefonar: 'Call',
      perfil_profissional: 'professional profile',
      estudio: 'Studio',
      gerado_ia: 'Generated by artificial intelligence',
      deixar_voz: 'Leave a voice message',
      responde_voz: 'Answers in his own voice, within minutes',
      prefiro_escrever: 'I would rather write',
      aviso_voz: 'The voice in the answer is synthetic, and the conversation is kept so you can listen again.',
      sua_conversa: 'Your conversation',
      abrir_conversa: 'Open conversation',
      esquecer: 'Forget this device',
      esquecido: 'Forgotten.',
      mensagem_para: 'Message to',
      conversa_com: 'Conversation with',
      toque_falar: 'Tap to speak',
      diga_o_que_quiser: 'Say whatever you want. Tap again to send.',
      falar: 'Speak',
      parar: 'Stop',
      parar_enviar: 'Stop and send',
      escrever_em_vez: 'Write instead of speaking',
      escreva_mensagem: 'Write your message',
      o_que_perguntar: 'What would you like to ask?',
      enviar: 'Send',
      prefiro_falar: 'I would rather speak',
      de_1200: 'of 1200',
      a_ouvir: 'Listening',
      fale_a_vontade: 'Take your time. Tap the circle, or the button, when you are done.',
      faltam_segundos: '{n} seconds left.',
      curto_demais: 'That was too short',
      toque_e_fale: 'Tap and speak for at least one second.',
      a_enviar: 'Sending',
      a_caminho: 'On its way',
      um_instante: 'One moment.',
      entregue: 'Delivered',
      esta_na_fila: 'You are in the queue',
      fica_a_ver: 'Stay here, or close and come back: the answer will not be lost.',
      a_sua_frente: 'ahead of you',
      a_sua_vez: 'Your turn',
      ouvir_enviei: 'Listen to what I sent',
      voltar: 'Back',
      nao_deu: 'That did not work',
      algo_correu_mal: 'Something went wrong',
      tente_outra_vez: 'Try again in a moment.',
      longa_demais: 'Message too long',
      mais_curta: 'Try again, shorter.',
      guardado_aparelho: 'Saved on this device',
      sem_rede: 'No connection right now',
      segue_sozinha: 'Your message is saved here and will be sent on its own once you are back online. You can close this.',
      em_espera: 'Waiting',
      a_demorar: 'This is taking longer than usual',
      volte_depois: 'You can close this. The answer will be here when you open the card again.',
      nova_mensagem: 'New message',
      falar_pessoa_real: 'I want to talk to the real person',
      avisado: 'Noted. He sees this and will answer.',
      voce: 'You',
      pessoa_real_curto: 'The real person',
      duplo_digital: 'Digital twin',
      mensagem_de_voz: 'Voice message',
      ouvir: 'Listen',
      ouvir_voz_aparelho: 'listen, device voice',
      a_tocar: 'playing, tap to stop',
      sem_microfone: 'This browser will not record sound. Use the write button below.',
      microfone_negado: 'We were not allowed to use the microphone. You can allow it in the browser settings, or write instead.',
      microfone_falhou: 'I could not open the microphone. Use the write button below.',
      gravacao_falhou: 'The recording failed halfway. Please try again.',
      mensagens: 'messages',
      mensagem: 'message',
      a_espera_resposta: 'waiting for an answer',
      texto_consentimento: 'To answer you, and to know how many different people open this card, we keep a random code on this device. We do not store your network address.',
      texto_consentimento_voz: 'To take your message and then deliver the answer back to you, we need to keep a random code on this device. Without it there is no way to know whose answer it is.',
      nao_obrigado: 'No, thank you',
      aceito: 'I accept',
      cartao: 'Card',
      vantagens: [
        ['At 3 in the morning', ' it still answers.'],
        ['It speaks your language', ', whichever that is.'],
        ['It explains ten times', ' without sighing.'],
        ['It never interrupts', ' and never says it is in a meeting.'],
      ],
    },
  };

  function lerLingua() {
    var guardada = null;
    try { guardada = localStorage.getItem(CHAVE_LINGUA); } catch (e) {}
    if (guardada && TEXTOS[guardada]) return guardada;
    var nav = (navigator.language || 'pt').slice(0, 2).toLowerCase();
    return TEXTOS[nav] ? nav : 'pt';
  }

  var lingua = lerLingua();
  function t(chave) {
    var d = TEXTOS[lingua] || TEXTOS.pt;
    var v = d[chave];
    if (v === undefined) v = TEXTOS.pt[chave];
    return v === undefined ? '' : v;
  }

  function perfilNaLingua() {
    var traducoes = perfilBase.linguas || {};
    var escolhida = traducoes[lingua] || {};
    var saida = {};
    for (var k in perfilBase) { if (k !== 'linguas') saida[k] = perfilBase[k]; }
    for (var j in escolhida) { if (escolhida[j]) saida[j] = escolhida[j]; }
    return saida;
  }

  var perfil = perfilNaLingua();

  function aplicarTextos() {
    document.documentElement.lang = lingua === 'pt' ? 'pt-PT' : lingua;
    var nos = document.querySelectorAll('[data-t]');
    for (var i = 0; i < nos.length; i++) {
      var chave = nos[i].getAttribute('data-t');
      var valor = t(chave);
      if (typeof valor === 'string') nos[i].textContent = valor;
    }
    $('texto').placeholder = t('o_que_perguntar');
    $('contador-texto').textContent = '0 ' + t('de_1200');
  }

  // --------------------------------------------------------------------- armazenamento
  // Em navegacao privada, com o armazenamento bloqueado, ler ou escrever ATIRA.
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
    // A data de nascimento vai dentro do codigo: e assim que os 13 meses se verificam sem guardar
    // mais nada, e e assim que ele NAO se renova a cada visita.
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

  function aceitou() { return ler(CHAVE_CONSENTIMENTO) === 'accepted'; }

  // --------------------------------------------------------------------- parte 0
  function paragrafos(texto) {
    var div = document.createElement('div');
    var partes = String(texto || '').split(/\n{2,}/);
    for (var i = 0; i < partes.length; i++) {
      var p = document.createElement('p');
      p.textContent = partes[i];
      div.appendChild(p);
    }
    return div;
  }

  function primeiroNome(nome) { return String(nome || '').trim().split(/\s+/)[0] || ''; }

  function formatarTelefone(digitos) {
    if (!digitos) return '';
    var d = digitos.replace(/^351/, '');
    if (d.length === 9) return d.slice(0, 3) + ' ' + d.slice(3, 6) + ' ' + d.slice(6);
    return '+' + digitos;
  }

  function pintarParte0() {
    perfil = perfilNaLingua();
    var nome = perfil.nome || (DADOS.dono && DADOS.dono.nome) || 'McMinsky';
    document.title = nome + ' | McMinsky';
    $('nome').textContent = nome;
    $('papel').textContent = perfil.papel || '';
    if (perfil.foto) { $('foto').src = perfil.foto; $('foto').alt = nome; }
    else { $('foto').parentNode.style.display = 'none'; }

    var bio = $('bio');
    bio.textContent = '';
    bio.appendChild(paragrafos(perfil.bio));

    var pn = primeiroNome(nome);
    var especialista = (DADOS.dono || {}).tipo === 'especialista';
    $('t-humana').textContent = (especialista ? t('responsavel_por') : t('falar_com')) + ' ' + pn;
    $('nota-humana').textContent = especialista ? t('pessoa_por_detras') : t('responde_quando_puder');

    function contacto(id, href, detalheId, detalhe) {
      var a = $(id);
      if (!href) { a.style.display = 'none'; return; }
      a.style.display = '';
      a.href = href;
      if (detalheId && detalhe !== undefined) $(detalheId).textContent = detalhe;
    }

    var tel = perfil.telefone ? String(perfil.telefone).replace(/\D/g, '') : '';
    var wa = perfil.whatsapp ? String(perfil.whatsapp).replace(/\D/g, '') : '';
    var saudacao = lingua === 'pt'
      ? 'Olá ' + pn + ', peguei no seu cartão.'
      : 'Hello ' + pn + ', I picked up your card.';

    contacto('b-whatsapp', wa ? 'https://wa.me/' + wa + '?text=' + encodeURIComponent(saudacao) : '');
    contacto('b-telegram', perfil.telegram ? 'https://t.me/' + perfil.telegram : '',
      'd-telegram', '@' + (perfil.telegram || ''));
    contacto('b-telefone', tel ? 'tel:+' + tel : '', 'd-telefone', formatarTelefone(tel));
    contacto('b-email', perfil.email ? 'mailto:' + perfil.email + '?subject=' + encodeURIComponent('McMinsky') : '',
      'd-email', perfil.email || '');
    contacto('b-linkedin', perfil.linkedin || '');
    contacto('b-mapa', perfil.mapa || '', 'd-morada', perfil.morada || '');

    var gemeo = perfil.gemeo_nome || (t('duplo_digital') + ' ' + pn);
    $('gemeo-nome').textContent = gemeo;
    var ecos = document.querySelectorAll('.gemeo-nome-eco');
    for (var i = 0; i < ecos.length; i++) ecos[i].textContent = gemeo;
    $('gemeo-nota').textContent = perfil.gemeo_nota || '';

    var lista = $('vantagens');
    lista.textContent = '';
    var vantagens = t('vantagens') || [];
    for (var v = 0; v < vantagens.length; v++) {
      var li = document.createElement('li');
      var forte = document.createElement('strong');
      forte.textContent = vantagens[v][0];
      li.appendChild(forte);
      li.appendChild(document.createTextNode(vantagens[v][1]));
      lista.appendChild(li);
    }

    if (!perfil.gemeo_activo) $('zona-digital').style.display = 'none';

    // O cartao de um especialista virtual inverte os lados: quem manda e a parte digital, e a parte
    // humana passa a ser quem responde por ele.
    if (especialista) {
      var digital = $('zona-digital');
      var humana = document.querySelector('.zona-humana');
      if (digital && humana && humana.parentNode && digital.nextSibling !== humana) {
        humana.parentNode.insertBefore(digital, humana);
      }
    }

    $('cartao-id').textContent = t('cartao') + ' ' + (cartao.p || '?') + ' · ' + (cartao.a || '?');
  }

  // --------------------------------------------------------------------- partilhar
  function ligacaoDoCartao() {
    // Leva a etiqueta do dono, a do afiliado, e uma origem propria: assim sabe-se que a visita veio
    // de alguem que partilhou, e nao do papel. Pedido dele a 16 Out 2026.
    var base = window.location.origin + '/C/' + cartao.p + '.' + cartao.a + '.S';
    return cartao.kk ? base + '.' + cartao.kk : base;
  }

  function avisoCopiado() {
    var d = document.createElement('div');
    d.className = 'copiado';
    d.textContent = t('copiado');
    document.body.appendChild(d);
    window.setTimeout(function () { d.remove(); }, 1800);
  }

  async function partilhar() {
    var url = ligacaoDoCartao();
    var titulo = (perfil.nome || 'McMinsky');
    try {
      if (navigator.share) {
        await navigator.share({ title: titulo, text: perfil.papel || '', url: url });
        return;
      }
    } catch (e) { /* cancelou, nao e erro */ return; }
    try {
      await navigator.clipboard.writeText(url);
      avisoCopiado();
    } catch (e) {
      window.prompt(t('partilhar'), url);
    }
  }

  // --------------------------------------------------------------------- consentimento
  var aoAceitar = null;

  function mostrarConsentimento(motivo, seguir) {
    var banner = $('consentimento');
    banner.querySelector('[data-t="texto_consentimento"]').textContent =
      motivo === 'voz' ? t('texto_consentimento_voz') : t('texto_consentimento');
    aoAceitar = seguir || null;
    banner.removeAttribute('hidden');
  }

  function tratarConsentimento() {
    if (aparelhoExpirado()) {
      // Passados os 13 meses o codigo morre e nao renasce sozinho: volta a perguntar-se.
      esquecer(CHAVE_APARELHO);
      esquecer(CHAVE_CONSENTIMENTO);
    }
    var estado = ler(CHAVE_CONSENTIMENTO);
    if (estado === 'accepted') {
      codigoAparelho(true);
      anunciarAparelho();
      return;
    }
    if (estado === 'rejected') return;
    // Primeira visita: o aviso abre a seguir ao ecra de carregamento, como ele pediu.
    window.setTimeout(function () { mostrarConsentimento('geral', null); }, 1200);
  }

  function ligarConsentimento() {
    var banner = $('consentimento');
    $('b-aceitar').addEventListener('click', function () {
      guardar(CHAVE_CONSENTIMENTO, 'accepted');
      banner.setAttribute('hidden', '');
      codigoAparelho(true);
      anunciarAparelho();
      if (aoAceitar) { var f = aoAceitar; aoAceitar = null; f(); }
    });
    $('b-recusar').addEventListener('click', function () {
      guardar(CHAVE_CONSENTIMENTO, 'rejected');
      banner.setAttribute('hidden', '');
      aoAceitar = null;
    });
  }

  function anunciarAparelho() {
    var v = codigoAparelho(false);
    if (!v || !DADOS.ficha) return;
    try {
      fetch('/api/visita/dispositivo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ficha: DADOS.ficha, aparelho: v, visita: DADOS.visita }),
        keepalive: true,
      }).catch(function () {});
    } catch (e) {}
  }

  // --------------------------------------------------------------------- palco
  var palco = $('palco');
  var passos = { 1: $('parte1'), '1b': $('parte1b'), 2: $('parte2'), 3: $('parte3') };

  function abrirPalco(qual) {
    palco.removeAttribute('hidden');
    try {
      if (palco.requestFullscreen) palco.requestFullscreen().catch(function () {});
      else if (palco.webkitRequestFullscreen) palco.webkitRequestFullscreen();
    } catch (e) {}
    irPara(qual);
  }

  // Nada do palco abre sem aceitacao. E a ordem dele, e e tambem a unica coisa honesta: sem
  // identificador nao ha como devolver a resposta.
  function abrirComConsentimento(qual) {
    if (aceitou()) { abrirPalco(qual); return; }
    mostrarConsentimento('voz', function () { abrirPalco(qual); });
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
    corpo.setAttribute('data-parte', String(qual).charAt(0));
  }

  // --------------------------------------------------------------------- parte 1: gravar
  var media = null, fluxo = null, pedacos = [], contexto = null, analisador = null;
  var desenho = 0, inicio = 0, cronometro = 0;

  function tipoSuportado() {
    var candidatos = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    for (var i = 0; i < candidatos.length; i++) {
      try { if (window.MediaRecorder && MediaRecorder.isTypeSupported(candidatos[i])) return candidatos[i]; } catch (e) {}
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
    if (!aceitou()) { mostrarConsentimento('voz', null); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      erroMicro(t('sem_microfone'));
      return;
    }
    try {
      fluxo = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e) {
      erroMicro(e && e.name === 'NotAllowedError' ? t('microfone_negado') : t('microfone_falhou'));
      return;
    }

    pedacos = [];
    var tipo = tipoSuportado();
    try { media = tipo ? new MediaRecorder(fluxo, { mimeType: tipo }) : new MediaRecorder(fluxo); }
    catch (e) { media = new MediaRecorder(fluxo); }

    media.ondataavailable = function (ev) { if (ev.data && ev.data.size) pedacos.push(ev.data); };
    media.onstop = function () { enviarGravacao(); };
    media.onerror = function () { erroMicro(t('gravacao_falhou')); pararGravacao(true); };

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
    $('micro-rotulo').textContent = t('parar');
    $('p1-titulo').textContent = t('a_ouvir');
    $('p1-sub').textContent = t('fale_a_vontade');
    $('cronometro').classList.remove('invisivel');
    $('b-escrever-2').classList.add('invisivel');
    animarAnel();
    cronometro = window.setInterval(tiqueCronometro, 200);
  }

  function tiqueCronometro() {
    var s = (Date.now() - inicio) / 1000;
    var m = Math.floor(s / 60), r = Math.floor(s % 60);
    $('cronometro').textContent = m + ':' + (r < 10 ? '0' : '') + r;
    var limite = $('limite');
    if (s >= AVISO_SEGUNDOS) {
      limite.classList.remove('invisivel');
      limite.textContent = t('faltam_segundos').replace('{n}', String(Math.max(0, Math.ceil(MAX_SEGUNDOS - s))));
    }
    if (s >= MAX_SEGUNDOS) pararGravacao(false);
  }

  function pararGravacao(cancelar) {
    window.clearInterval(cronometro);
    cronometro = 0;
    window.cancelAnimationFrame(desenho);
    corpo.removeAttribute('data-gravando');
    $('micro-rotulo').textContent = t('falar');
    $('limite').classList.add('invisivel');
    if (cancelar && media) { try { media.onstop = null; } catch (e) {} }
    try { if (media && media.state !== 'inactive') media.stop(); } catch (e) {}
    try { if (fluxo) fluxo.getTracks().forEach(function (x) { x.stop(); }); } catch (e) {}
    try { if (contexto && contexto.close) contexto.close(); } catch (e) {}
    contexto = null; analisador = null; fluxo = null;
  }

  function pararTudo() {
    if (corpo.getAttribute('data-gravando')) pararGravacao(true);
    pararPolling();
    pararAnimacao();
  }

  // O anel: o volume da voz, em tempo real.
  //
  // A primeira versao somava o espectro inteiro e dividia por um numero fixo. Isso da quase o mesmo
  // valor para o ruido da sala e para alguem a gritar, que foi exactamente o que ele viu:
  // "o ruido de fundo quase que tem o mesmo efeito visual que a voz até a gritar".
  //
  // O que esta aqui agora faz tres coisas diferentes:
  //  1. mede a ENERGIA do sinal (valor eficaz) na forma de onda, nao a media do espectro;
  //  2. aprende o CHAO DE RUIDO nos primeiros instantes e subtrai-o, por isso o silencio de uma
  //     sala fica mesmo em zero;
  //  3. estica o que sobra com uma curva de expoente, o que separa falar de gritar.
  // Resultado: amplitude de variacao muito maior, e so a voz a move.
  function animarAnel() {
    var tela = $('anel');
    var ctx = tela.getContext('2d');
    var onda = analisador ? new Uint8Array(analisador.fftSize) : null;
    var fase = 0;
    var chao = 0.04;        // estimativa inicial do ruido de fundo
    var aprendidas = 0;
    var suave = 0;
    var pico = 0;

    function quadro() {
      desenho = window.requestAnimationFrame(quadro);
      var l = tela.width, c = l / 2, raio = l * 0.3;
      ctx.clearRect(0, 0, l, l);

      var bruto = 0;
      if (analisador && onda) {
        analisador.getByteTimeDomainData(onda);
        var soma = 0;
        for (var i = 0; i < onda.length; i++) {
          var d = (onda[i] - 128) / 128;
          soma += d * d;
        }
        bruto = Math.sqrt(soma / onda.length);
      }

      // Os primeiros instantes sao a sala, nao a voz: servem para saber o que e silencio.
      if (aprendidas < 45) { chao = (chao * aprendidas + bruto) / (aprendidas + 1); aprendidas++; }
      else if (bruto < chao) { chao = chao * 0.97 + bruto * 0.03; }

      var limpo = Math.max(0, bruto - chao * 1.4);
      // Escala de decibeis, nao linear: o ouvido ouve assim e, sobretudo, assim ha DEGRAUS entre
      // falar baixo, falar normal e falar alto. A primeira versao multiplicava e elevava a uma
      // potencia, e qualquer som chegava quase ao maximo, que foi o que ele viu.
      var volume = 0;
      if (limpo > 0.0008) {
        volume = (Math.log(limpo) / Math.LN10 + 2.35) / 1.75;   // 0,0045 -> 0 ; 0,27 -> 1
        volume = Math.max(0, Math.min(1, volume));
      }
      // Sobe depressa e desce devagar, mas sem saltos: e assim que uma barra de som se le bem.
      suave = volume > suave ? volume * 0.45 + suave * 0.55 : volume * 0.12 + suave * 0.88;
      pico = Math.max(pico * 0.95, suave);

      fase += 0.02;
      var barras = 84;
      for (var b = 0; b < barras; b++) {
        var ang = (b / barras) * Math.PI * 2 - Math.PI / 2;
        var ruga = 0.45 + 0.55 * Math.sin(fase * 2.3 + b * 0.62) * Math.sin(fase * 0.7 + b * 0.21);
        // O comprimento maximo e metade do raio: assim o anel nunca toca nos limites da caixa,
        // que era o outro reparo dele.
        var comp = raio * (0.045 + suave * 0.5 * (0.4 + 0.6 * ruga));
        var forca = 0.14 + suave * 0.66;
        ctx.strokeStyle = 'rgba(245,245,245,' + forca.toFixed(3) + ')';
        ctx.lineWidth = l * (0.0055 + suave * 0.004);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(c + Math.cos(ang) * raio, c + Math.sin(ang) * raio);
        ctx.lineTo(c + Math.cos(ang) * (raio + comp), c + Math.sin(ang) * (raio + comp));
        ctx.stroke();
      }

      // Um aro que respira com o pico, para haver resposta mesmo nas pausas entre palavras.
      ctx.strokeStyle = 'rgba(201,169,98,' + (0.08 + pico * 0.38).toFixed(3) + ')';
      ctx.lineWidth = l * 0.003;
      ctx.beginPath();
      ctx.arc(c, c, raio * (1 + pico * 0.22), 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255,255,255,0.09)';
      ctx.lineWidth = l * 0.004;
      ctx.beginPath(); ctx.arc(c, c, raio, 0, Math.PI * 2); ctx.stroke();
    }
    quadro();
  }

  // --------------------------------------------------------------------- envio
  var aEnviar = false;

  async function enviarGravacao() {
    var ms = Math.max(0, Date.now() - inicio);
    var bocado = new Blob(pedacos, { type: (pedacos[0] && pedacos[0].type) || 'audio/webm' });
    pedacos = [];
    if (!bocado.size || ms < MIN_MS) {
      irPara(1);
      $('p1-titulo').textContent = t('curto_demais');
      $('p1-sub').textContent = t('toque_e_fale');
      $('cronometro').classList.add('invisivel');
      $('b-escrever-2').classList.remove('invisivel');
      return;
    }
    await enviar({ audio: bocado, ms: ms });
  }

  async function enviar(carga) {
    if (aEnviar) return;
    aEnviar = true;
    irPara(2);
    $('p2-selo').textContent = t('a_enviar');
    $('p2-titulo').textContent = t('a_caminho');
    $('p2-sub').textContent = t('um_instante');
    $('fila').setAttribute('hidden', '');
    $('b-ouvir-enviado').setAttribute('hidden', '');

    var v = codigoAparelho(true);
    var corpoEnvio = new FormData();
    corpoEnvio.append('ficha', DADOS.ficha || '');
    corpoEnvio.append('aparelho', v || '');
    if (carga.audio) { corpoEnvio.append('audio', carga.audio, 'mensagem'); corpoEnvio.append('ms', String(carga.ms || 0)); }
    if (carga.texto) corpoEnvio.append('texto', carga.texto);

    try {
      var r = await fetch('/api/voz/mensagem', { method: 'POST', body: corpoEnvio });
      var j = await r.json();
      aEnviar = false;
      if (!j.ok) { falhaEnvio(j.erro); return; }
      guardar(CHAVE_CONVERSA, String(j.conversa));
      if (carga.audio) guardarCopiaLocal(j.mensagem, carga.audio);
      chegouAFila(j);
    } catch (e) {
      aEnviar = false;
      await guardarNaMala(carga);
      semRede();
    }
  }

  function falhaEnvio(codigo) {
    pararAnimacao();
    irPara(2);
    $('p2-selo').textContent = t('nao_deu');
    $('fila').setAttribute('hidden', '');
    if (codigo === 'muito_grande' || codigo === 'muito_longa') {
      $('p2-titulo').textContent = t('longa_demais');
      $('p2-sub').textContent = t('mais_curta');
    } else {
      $('p2-titulo').textContent = t('algo_correu_mal');
      $('p2-sub').textContent = t('tente_outra_vez');
    }
    mostrarVoltar();
  }

  function semRede() {
    pararAnimacao();
    irPara(2);
    $('p2-selo').textContent = t('guardado_aparelho');
    $('p2-titulo').textContent = t('sem_rede');
    $('p2-sub').textContent = t('segue_sozinha');
    $('fila').setAttribute('hidden', '');
    mostrarVoltar();
  }

  function mostrarVoltar() {
    var b = $('b-ouvir-enviado');
    b.textContent = t('voltar');
    b.removeAttribute('hidden');
    b.onclick = function () { irPara(1); repor1(); };
  }

  function repor1() {
    $('p1-titulo').textContent = t('toque_falar');
    $('p1-sub').textContent = t('diga_o_que_quiser');
    $('cronometro').classList.add('invisivel');
    $('cronometro').textContent = '0:00';
    $('b-escrever-2').classList.remove('invisivel');
    limparErroMicro();
  }

  // ------------------------------------------------------------ mala de fora de rede
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
        if (j.ok) guardar(CHAVE_CONVERSA, String(j.conversa));
        else sobram.push(item);
      } catch (e) { sobram.push(item); }
    }
    try { await kv.set('mcminsky_mala', sobram); } catch (e) {}
  }

  async function guardarCopiaLocal(idMensagem, bocado) {
    var kv = mala();
    if (!kv || !idMensagem) return;
    try { await kv.set('mcminsky_audio_' + idMensagem, bocado); } catch (e) {}
  }

  // --------------------------------------------------------------------- parte 2
  var filaTimer = 0, filaValor = 0, animacaoCorre = 0;

  function chegouAFila(resposta) {
    $('p2-selo').textContent = t('entregue');
    $('p2-titulo').textContent = t('esta_na_fila');
    $('p2-sub').textContent = t('fica_a_ver');
    filaValor = Math.max(1, Number(resposta.posicao) || 3);
    $('fila-numero').textContent = String(filaValor);
    $('fila').removeAttribute('hidden');
    descerFila();
    comecarPolling(resposta.conversa, resposta.mensagem);
  }

  // O numero desce a um ritmo irregular de proposito: um contador certinho parece falso, e este
  // numero e uma estimativa. Nunca chega a zero sozinho, so quando a resposta existe mesmo.
  function descerFila() {
    window.clearTimeout(filaTimer);
    if (filaValor <= 1) return;
    filaTimer = window.setTimeout(function () {
      filaValor -= 1;
      $('fila-numero').textContent = String(filaValor);
      descerFila();
    }, 2600 + Math.random() * 4200);
  }

  var polling = 0, pollingDesde = 0, pollingIntervalo = 3500;

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
      if (resposta) { window.clearTimeout(filaTimer); await atender(estado, resposta.id); return; }
      var passou = Date.now() - pollingDesde;
      if (passou > 60000) pollingIntervalo = 9000;
      if (passou > 240000) pollingIntervalo = 20000;
      if (passou > 900000) { pollingLongo(); return; }
      polling = window.setTimeout(tique, pollingIntervalo);
    };
    polling = window.setTimeout(tique, 2500);
  }

  function pollingLongo() {
    $('p2-selo').textContent = t('em_espera');
    $('p2-titulo').textContent = t('a_demorar');
    $('p2-sub').textContent = t('volte_depois');
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

  // Dois segundos, e so dois. Arcos concentricos que se alinham e um traco que se fecha.
  function animacaoAtendimento() {
    return new Promise(function (resolve) {
      var tela = $('animacao');
      tela.classList.add('ligada');
      var ctx = tela.getContext('2d');
      var t0 = performance.now();
      var DUR = 1900;

      function quadro(agora) {
        var x = Math.min(1, (agora - t0) / DUR);
        var e = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
        var l = tela.width, c = l / 2;
        ctx.clearRect(0, 0, l, l);

        for (var k = 0; k < 5; k++) {
          var raio = l * (0.14 + k * 0.065);
          var inicioA = -Math.PI / 2 + (1 - e) * (k % 2 ? -1 : 1) * Math.PI * (1.1 - k * 0.12);
          var arco = Math.PI * 2 * e * (0.35 + k * 0.1);
          ctx.strokeStyle = 'rgba(245,245,245,' + (0.12 + 0.45 * e * (1 - k * 0.12)) + ')';
          ctx.lineWidth = l * 0.0055;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(c, c, raio, inicioA, inicioA + arco);
          ctx.stroke();
        }

        var pontos = 48;
        ctx.beginPath();
        for (var i = 0; i <= pontos; i++) {
          var px = (i / pontos) * l;
          var amp = l * 0.055 * Math.sin(Math.PI * e) * Math.sin(i * 0.55 + e * 7);
          var py = c + amp * (1 - Math.abs(i / pontos - 0.5) * 1.6);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = 'rgba(201,169,98,' + (0.6 * Math.sin(Math.PI * e)) + ')';
        ctx.lineWidth = l * 0.004;
        ctx.stroke();

        if (x < 1) animacaoCorre = window.requestAnimationFrame(quadro);
        else { tela.classList.remove('ligada'); ctx.clearRect(0, 0, l, l); resolve(); }
      }
      animacaoCorre = window.requestAnimationFrame(quadro);
    });
  }

  function pararAnimacao() {
    window.cancelAnimationFrame(animacaoCorre);
    var tela = $('animacao');
    if (tela) {
      tela.classList.remove('ligada');
      try { tela.getContext('2d').clearRect(0, 0, tela.width, tela.height); } catch (e) {}
    }
  }

  async function atender(estado, novaId) {
    pararPolling();
    $('p2-selo').textContent = t('a_sua_vez');
    $('p2-titulo').textContent = '';
    $('p2-sub').textContent = '';
    $('fila').setAttribute('hidden', '');
    await animacaoAtendimento();
    pintarFio(estado, novaId);
    irPara(3);
    avisar(estado);
  }

  // --------------------------------------------------------------------- parte 3
  var estadoActual = null;

  var jaTocadas = {};

  function pintarFio(estado, novaId) {
    estadoActual = estado;
    var fio = $('fio');
    fio.textContent = '';
    var lista = (estado && estado.mensagens) || [];
    for (var i = 0; i < lista.length; i++) {
      // So a resposta que acabou de chegar toca sozinha, e so uma vez. Reabrir a conversa nunca
      // dispara som: ninguem quer um cartao que comeca a falar sozinho ao abrir.
      var destacar = !!novaId && lista[i].id === novaId && !jaTocadas[lista[i].id];
      if (destacar) jaTocadas[lista[i].id] = true;
      fio.appendChild(bolhaDe(lista[i], destacar));
    }
    fio.scrollTop = fio.scrollHeight;
  }

  function bolhaDe(m, destacar) {
    var div = document.createElement('div');
    div.className = 'bolha bolha-' + m.papel + (m.estado === 'pendente' && m.papel !== 'visitante' ? ' bolha-pendente' : '');
    var quem = document.createElement('span');
    quem.className = 'quem';
    quem.textContent = m.papel === 'visitante' ? t('voce')
      : (m.papel === 'humano' ? (perfil.nome || t('pessoa_real_curto'))
        : ((perfil.gemeo_nome || t('duplo_digital')) + ' · IA'));
    div.appendChild(quem);

    var paragrafo = null;
    if (m.texto) {
      paragrafo = document.createElement('p');
      paragrafo.textContent = destacar ? '' : m.texto;
      if (destacar) paragrafo.classList.add('a-escrever');
      div.appendChild(paragrafo);
    } else if (m.papel === 'visitante') {
      var p2 = document.createElement('p');
      p2.textContent = t('mensagem_de_voz');
      p2.style.opacity = '0.7';
      div.appendChild(p2);
    }

    if (m.audio) div.appendChild(leitorDe(m, destacar, paragrafo, m.texto || ''));
    else if (m.texto && m.papel !== 'visitante') {
      div.appendChild(leitorDoBrowser(m.texto));
      if (destacar) escreverAosPoucos(paragrafo, m.texto, null);
    }
    return div;
  }

  // O texto aparece letra a letra, ao RITMO DO AUDIO quando ha audio: acaba de escrever quando a
  // voz acaba de falar. Sem audio, escreve a um ritmo fixo. Parar o som pousa tambem o texto onde
  // esta, e o texto completo fica sempre disponivel ao fim de poucos segundos, aconteca o que
  // acontecer: ninguem pode ficar sem poder ler so porque o som falhou.
  function escreverAosPoucos(paragrafo, completo, progresso) {
    if (!paragrafo) return { parar: function () {} };
    var parado = false;
    var relogio = 0;

    function mostrar(fraccao) {
      var n = Math.max(0, Math.min(completo.length, Math.round(completo.length * fraccao)));
      paragrafo.textContent = completo.slice(0, n);
      if (n >= completo.length) paragrafo.classList.remove('a-escrever');
    }

    if (typeof progresso === 'function') {
      relogio = window.setInterval(function () {
        if (parado) return;
        var f = progresso();
        if (f === null || f === undefined) return;
        mostrar(f);
        if (f >= 1) { window.clearInterval(relogio); }
      }, 60);
    } else {
      var t0 = Date.now();
      var duracao = Math.max(900, completo.length * 22);
      relogio = window.setInterval(function () {
        if (parado) return;
        var f = (Date.now() - t0) / duracao;
        mostrar(Math.min(1, f));
        if (f >= 1) window.clearInterval(relogio);
      }, 40);
    }

    return {
      parar: function () { parado = true; window.clearInterval(relogio); mostrar(1); },
      completar: function () { window.clearInterval(relogio); mostrar(1); },
    };
  }

  function urlDoAudio(m) {
    return '/api/voz/audio?ficha=' + encodeURIComponent(DADOS.ficha || '')
      + '&aparelho=' + encodeURIComponent(codigoAparelho(false) || '')
      + '&mensagem=' + encodeURIComponent(m.id);
  }

  function leitorDe(m, destacar, paragrafo, completo) {
    var caixa = document.createElement('div');
    caixa.className = 'leitor';
    var url = urlDoAudio(m);
    var claro = m.papel !== 'visitante';

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
        tocar.setAttribute('aria-label', t('ouvir'));
        tocar.textContent = '▶';
        var tempo = document.createElement('span');
        tempo.className = 'leitor-tempo';
        tempo.textContent = '0:00';
        barra.appendChild(tocar); barra.appendChild(tempo);
        caixa.appendChild(barra);

        var ws = window.WaveSurfer.create({
          container: onda,
          height: 40,
          waveColor: claro ? 'rgba(18,18,18,0.22)' : 'rgba(255,255,255,0.25)',
          progressColor: claro ? '#121212' : '#f5f5f5',
          cursorWidth: 0,
          barWidth: 2,
          barGap: 2,
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
        // A escrita acompanha o som: a fraccao tocada e a fraccao escrita.
        var escrita = null;
        if (destacar && completo) {
          escrita = escreverAosPoucos(paragrafo, completo, function () {
            var d = ws.getDuration();
            if (!d) return null;
            return Math.min(1, ws.getCurrentTime() / d);
          });
          // Rede de seguranca: se o som nunca arrancar, o texto aparece na mesma.
          window.setTimeout(function () {
            try { if (!ws.isPlaying() && ws.getCurrentTime() === 0) escrita.completar(); } catch (e) {}
          }, 3500);
        }

        var estado = document.createElement('span');
        estado.className = 'leitor-estado';
        barra.appendChild(estado);

        function parar() {
          try { ws.pause(); } catch (e) {}
          if (escrita) escrita.parar();
        }
        tocar.addEventListener('click', function () { if (ws.isPlaying()) parar(); });

        ws.on('ready', function () {
          var d = ws.getDuration();
          var r = Math.floor(d % 60);
          tempo.textContent = Math.floor(d / 60) + ':' + (r < 10 ? '0' : '') + r;
          if (destacar) {
            // Tocar sozinho e permitido porque a pessoa carregou num botao para chegar aqui. Se o
            // browser recusar na mesma, fica o botao, e o texto escreve-se de qualquer maneira.
            try {
              var promessa = ws.play();
              if (promessa && promessa.catch) promessa.catch(function () { if (escrita) escrita.completar(); });
            } catch (e) { if (escrita) escrita.completar(); }
          }
        });
        ws.on('finish', function () { estado.textContent = ''; if (escrita) escrita.completar(); });
        ws.on('play', function () { estado.textContent = t('a_tocar'); });
        ws.on('pause', function () { estado.textContent = ''; });

        ws.on('error', function () {
          caixa.textContent = '';
          caixa.appendChild(leitorSimples(url));
          if (escrita) escrita.completar();
        });
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

  // A terceira forma de ouvir, da lista dele: a voz do proprio aparelho. Serve de rede de seguranca
  // para uma resposta que venha so em texto, e funciona sem rede.
  function leitorDoBrowser(texto) {
    var caixa = document.createElement('div');
    caixa.className = 'leitor-barra';
    if (!('speechSynthesis' in window)) return caixa;

    var botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'leitor-tocar';
    botao.setAttribute('aria-label', t('ouvir'));
    botao.textContent = '▶';
    var nota = document.createElement('span');
    nota.className = 'leitor-tempo';
    nota.textContent = t('ouvir_voz_aparelho');

    botao.addEventListener('click', function () {
      try {
        if (window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); botao.textContent = '▶'; return; }
        var fala = new SpeechSynthesisUtterance(texto);
        fala.lang = lingua === 'pt' ? 'pt-PT' : 'en-GB';
        var vozes = window.speechSynthesis.getVoices() || [];
        for (var i = 0; i < vozes.length; i++) {
          if (vozes[i].lang && vozes[i].lang.toLowerCase().indexOf(fala.lang.toLowerCase()) === 0) { fala.voice = vozes[i]; break; }
        }
        fala.onend = function () { botao.textContent = '▶'; };
        botao.textContent = '⏸';
        window.speechSynthesis.speak(fala);
      } catch (e) { botao.textContent = '▶'; }
    });

    caixa.appendChild(botao);
    caixa.appendChild(nota);
    return caixa;
  }

  function avisar(estado) {
    try {
      if (!('Notification' in window)) return;
      if (document.visibilityState === 'visible') return;
      if (Notification.permission !== 'granted') return;
      var ultima = estado.mensagens[estado.mensagens.length - 1];
      new Notification(perfil.gemeo_nome || 'McMinsky', {
        body: (ultima && ultima.texto ? String(ultima.texto).slice(0, 110) : t('a_sua_vez')),
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

  // --------------------------------------------------------------------- conversa guardada
  async function mostrarConversaGuardada() {
    var conversa = ler(CHAVE_CONVERSA);
    if (!conversa || !codigoAparelho(false)) return;
    var estado = await verConversa(conversa);
    if (!estado || !estado.mensagens.length) return;
    var porResponder = 0;
    for (var i = 0; i < estado.mensagens.length; i++) {
      if (estado.mensagens[i].papel === 'visitante' && estado.mensagens[i].estado !== 'respondida') porResponder++;
    }
    var n = estado.mensagens.length;
    $('resumo-conversa').textContent = n + ' ' + (n === 1 ? t('mensagem') : t('mensagens'))
      + (porResponder ? ', ' + porResponder + ' ' + t('a_espera_resposta') : '');
    $('conversas-antigas').removeAttribute('hidden');
    $('b-abrir-conversa').onclick = function () { pintarFio(estado); abrirPalco(3); };
  }

  // --------------------------------------------------------------------- ligacoes
  function ligar() {
    $('b-partilhar').addEventListener('click', partilhar);
    $('b-voz').addEventListener('click', function () { repor1(); abrirComConsentimento(1); pedirAvisoUmaVez(); });
    $('b-escrever').addEventListener('click', function () { abrirComConsentimento('1b'); pedirAvisoUmaVez(); });
    $('b-escrever-2').addEventListener('click', function () { irPara('1b'); });
    $('b-voltar-voz').addEventListener('click', function () { irPara(1); repor1(); });
    $('b-fechar').addEventListener('click', fecharPalco);

    $('b-gravar').addEventListener('click', function () {
      if (corpo.getAttribute('data-gravando')) pararGravacao(false);
      else comecarGravacao();
    });

    var texto = $('texto');
    texto.addEventListener('input', function () {
      $('contador-texto').textContent = texto.value.length + ' ' + t('de_1200');
      $('b-enviar-texto').disabled = texto.value.trim().length < 2;
    });
    $('b-enviar-texto').addEventListener('click', function () {
      var v = texto.value.trim();
      if (v.length < 2) return;
      $('b-enviar-texto').disabled = true;
      texto.value = '';
      $('contador-texto').textContent = '0 ' + t('de_1200');
      enviar({ texto: v });
    });

    $('b-nova').addEventListener('click', function () { irPara(1); repor1(); });
    $('b-humano').addEventListener('click', async function () {
      var b = $('b-humano');
      b.disabled = true;
      b.textContent = t('avisado');
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
      $('b-esquecer').textContent = t('esquecido');
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !palco.hasAttribute('hidden')) fecharPalco();
    });
    window.addEventListener('online', esvaziarMala);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') esvaziarMala();
    });
  }

  function mudarLingua(nova) {
    if (!TEXTOS[nova]) return;
    lingua = nova;
    aplicarTextos();
    pintarParte0();
    if (estadoActual) pintarFio(estadoActual);
  }

  // --------------------------------------------------------------------- arranque
  try {
    // A barra de cima, o rodape e o ecra de carregamento sao os do sitio, de um so sitio.
    if (window.McMinskyComponentes) {
      window.McMinskyComponentes.montar({ lingua: lingua, raiz: '/', aoMudarLingua: mudarLingua });
    }
    aplicarTextos();
    pintarParte0();
    ligar();
    ligarConsentimento();
    tratarConsentimento();
    window.setTimeout(esvaziarMala, 1500);
    window.setTimeout(mostrarConversaGuardada, 400);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/c/sw.js').catch(function () {});
  } catch (e) {
    if (window.console) console.error(e);
  }
})();
