/* Os pedacos que se repetem em todo o lado: o ecra de carregamento, a barra de cima e o rodape.
 *
 * Porque existe: estavam copiados a mao em cada pagina HTML do sitio, o que significa que mudar uma
 * ligacao do rodape obriga a mexer em dezenas de ficheiros e, na pratica, deixa versoes diferentes
 * espalhadas. Pergunta dele a 16 Out 2026: "ainda está em html estatico repetido em cada pagina
 * html? nao é melhor duma vez por todas ter esse elemento sempre só um, sem replicas?".
 *
 * Aqui estao UMA vez. Quem quiser usa-os assim:
 *
 *   McMinskyComponentes.montar({ lingua: 'pt', raiz: '/', cabecalho: true, rodape: true });
 *
 * As paginas do sitio que ainda os tem copiados a mao continuam a funcionar: isto nao as toca. A
 * passagem delas para aqui faz-se depois, pagina a pagina, com a verificacao a correr.
 */
(function (global) {
  'use strict';

  var LOGO = 'https://i.postimg.cc/T27BCpJj/logo-without-text.png';
  var CHAVE_LINGUA = 'mcminsky_lang';

  var TEXTOS = {
    pt: {
      menu: 'Menu',
      programas: 'Programas',
      instituicoes: 'Instituições',
      metodo: 'Método',
      navegacao: 'Navegação',
      localizacao: 'Localização',
      descricao: 'Centros de estudo, formação e consultoria. Lisboa e onde for preciso.',
      mapa: 'Ver no Google Maps',
      termos: 'Termos e Condições',
      privacidade: 'Política de Privacidade',
      reclamacoes: 'Livro de Reclamações',
      direitos: 'Todos os direitos reservados.',
    },
    en: {
      menu: 'Menu',
      programas: 'Programmes',
      instituicoes: 'Institutions',
      metodo: 'Method',
      navegacao: 'Navigation',
      localizacao: 'Where we are',
      descricao: 'Study centres, training and consultancy. Lisbon and wherever needed.',
      mapa: 'Open in Google Maps',
      termos: 'Terms and Conditions',
      privacidade: 'Privacy Policy',
      reclamacoes: 'Complaints Book',
      direitos: 'All rights reserved.',
    },
  };

  var MORADA = {
    linha1: 'Azinhaga da Cidade 24A r/c',
    linha2: '1750-063 Lisboa',
    mapa: 'https://share.google/UYurFIThaS7dtm1SQ',
  };

  function t(lingua, chave) {
    return (TEXTOS[lingua] || TEXTOS.pt)[chave] || TEXTOS.pt[chave] || '';
  }

  function lerLingua() {
    try { return localStorage.getItem(CHAVE_LINGUA) || 'pt'; } catch (e) { return 'pt'; }
  }

  function guardarLingua(lingua) {
    try { localStorage.setItem(CHAVE_LINGUA, lingua); } catch (e) {}
  }

  function loader() {
    var d = document.createElement('div');
    d.className = 'loader';
    d.innerHTML = '<img src="' + LOGO + '" alt="McMinsky" class="loader-logo">'
      + '<span class="loader-text">McMinsky</span>'
      + '<div class="loader-bar"></div>';
    return d;
  }

  function cabecalho(lingua, raiz) {
    var h = document.createElement('header');
    h.className = 'header';
    h.innerHTML =
      '<div class="header-inner">'
      + '<a href="' + raiz + '" class="logo">'
      + '<img src="' + LOGO + '" alt="McMinsky"><span class="logo-text">McMinsky</span></a>'
      + '<button class="nav-toggle" aria-label="' + t(lingua, 'menu') + '"><span></span><span></span><span></span></button>'
      + '<nav class="nav"><ul class="nav-list">'
      + '<li class="nav-item"><a href="' + raiz + 'programas/" class="nav-link">' + t(lingua, 'programas') + '</a></li>'
      + '<li class="nav-item"><a href="' + raiz + 'institucional/" class="nav-link">' + t(lingua, 'instituicoes') + '</a></li>'
      + '<li class="nav-item"><a href="' + raiz + 'metodo/" class="nav-link">' + t(lingua, 'metodo') + '</a></li>'
      + '</ul>'
      + '<div class="lang-switch">'
      + '<button class="lang-btn' + (lingua === 'pt' ? ' active' : '') + '" data-lang="pt">PT</button>'
      + '<button class="lang-btn' + (lingua === 'en' ? ' active' : '') + '" data-lang="en">EN</button>'
      + '</div></nav></div>';
    return h;
  }

  function rodape(lingua, raiz) {
    var f = document.createElement('footer');
    f.className = 'footer';
    f.innerHTML =
      '<div class="footer-grid">'
      + '<div class="footer-brand">'
      + '<a href="' + raiz + '" class="logo"><img src="' + LOGO + '" alt="McMinsky">'
      + '<span class="logo-text">McMinsky</span></a>'
      + '<p>' + t(lingua, 'descricao') + '</p></div>'
      + '<div class="footer-links"><h4>' + t(lingua, 'navegacao') + '</h4><ul>'
      + '<li><a href="' + raiz + 'programas/">' + t(lingua, 'programas') + '</a></li>'
      + '<li><a href="' + raiz + 'institucional/">' + t(lingua, 'instituicoes') + '</a></li>'
      + '<li><a href="' + raiz + 'metodo/">' + t(lingua, 'metodo') + '</a></li>'
      + '</ul></div>'
      + '<div class="footer-contact"><h4>' + t(lingua, 'localizacao') + '</h4>'
      + '<p>' + MORADA.linha1 + '</p><p>' + MORADA.linha2 + '</p>'
      + '<a href="' + MORADA.mapa + '" class="footer-maps-btn" target="_blank" rel="noopener">'
      + '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"'
      + ' stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg> ' + t(lingua, 'mapa') + '</a>'
      + '</div></div>'
      + '<div class="footer-bottom"><div class="footer-legal">'
      + '<a href="' + raiz + 'legal/terms.html">' + t(lingua, 'termos') + '</a>'
      + '<a href="' + raiz + 'legal/privacy.html">' + t(lingua, 'privacidade') + '</a>'
      + '<a href="https://www.livroreclamacoes.pt/inicio/reclamacao?nipc=517747120" target="_blank" rel="noopener">'
      + t(lingua, 'reclamacoes') + '</a></div>'
      + '<p class="footer-copyright">&copy; <span class="current-year">'
      + new Date().getFullYear() + '</span> McMinsky. ' + t(lingua, 'direitos') + '</p></div>';
    return f;
  }

  // O menu da barra de cima abre e fecha. Esta aqui e nao no ficheiro grande do sitio porque e
  // comportamento DO componente: quem monta o cabecalho leva o botao a funcionar.
  function ligarMenu(h) {
    var botao = h.querySelector('.nav-toggle');
    var nav = h.querySelector('.nav');
    if (!botao || !nav) return;
    botao.addEventListener('click', function () {
      nav.classList.toggle('active');
      botao.classList.toggle('active');
    });
  }

  function montar(opcoes) {
    var o = opcoes || {};
    var lingua = o.lingua || lerLingua();
    var raiz = o.raiz || '/';
    var saida = {};

    if (o.loader !== false) {
      var l = loader();
      document.body.insertBefore(l, document.body.firstChild);
      saida.loader = l;
      var esconder = function () { l.classList.add('hidden'); };
      if (document.readyState === 'complete') window.setTimeout(esconder, 350);
      else window.addEventListener('load', function () { window.setTimeout(esconder, 350); });
      // Rede de seguranca: um recurso preso nunca pode deixar a pagina tapada para sempre.
      window.setTimeout(esconder, 4000);
    }

    if (o.cabecalho !== false) {
      var h = cabecalho(lingua, raiz);
      document.body.insertBefore(h, saida.loader ? saida.loader.nextSibling : document.body.firstChild);
      ligarMenu(h);
      saida.cabecalho = h;
      if (typeof o.aoMudarLingua === 'function') {
        h.querySelectorAll('.lang-btn').forEach(function (b) {
          b.addEventListener('click', function () {
            var nova = b.getAttribute('data-lang');
            guardarLingua(nova);
            h.querySelectorAll('.lang-btn').forEach(function (x) {
              x.classList.toggle('active', x === b);
            });
            o.aoMudarLingua(nova);
          });
        });
      }
    }

    if (o.rodape !== false) {
      var f = rodape(lingua, raiz);
      document.body.appendChild(f);
      saida.rodape = f;
    }

    return saida;
  }

  global.McMinskyComponentes = {
    montar: montar,
    lerLingua: lerLingua,
    guardarLingua: guardarLingua,
    textos: TEXTOS,
    morada: MORADA,
  };
})(window);
