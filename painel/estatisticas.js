/* Back office dos cartoes.
 *
 * Tudo o que se ve aqui sai de consultas que ja vem somadas do servidor. O ecra NUNCA conta o
 * universo: nao ha um unico sitio nesta pagina onde abrir o painel custe mais por haver mais
 * historia. Foi uma licao cara.
 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var estado = { dono: '', afiliado: '', dias: 30, ultimoId: null, afiliadoEmEdicao: null };
  var graficoTempo = null;
  var graficoAfiliado = null;

  function texto(valor) { return (valor === null || valor === undefined) ? '' : String(valor); }

  function numero(n) {
    return Number(n || 0).toLocaleString('pt-PT');
  }

  function quando(ts) {
    var d = new Date(Number(ts) * 1000);
    var dia = String(d.getDate()).padStart(2, '0');
    var mes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][d.getMonth()];
    return dia + ' ' + mes + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  async function pedir(caminho, opcoes) {
    var r = await fetch(caminho, opcoes);
    if (r.status === 401) { window.location.href = '/painel'; return null; }
    try { return await r.json(); } catch (e) { return null; }
  }

  function parametros() {
    var p = new URLSearchParams();
    if (estado.dono) p.set('dono', estado.dono);
    if (estado.afiliado) p.set('afiliado', estado.afiliado);
    return p;
  }

  // ------------------------------------------------------------------ numeros e graficos
  async function carregarEstatisticas() {
    var p = parametros();
    p.set('dias', estado.dias);
    var j = await pedir('/api/estatisticas?' + p.toString());
    if (!j || !j.ok) return;

    var t = j.total || {};
    $('fichas').innerHTML = '';
    ficha('fichas', numero(t.visitas), 'aberturas', '');
    ficha('fichas', numero(t.aparelhos), 'aparelhos distintos', '');
    ficha('fichas', numero(t.robos), 'robôs', 'robo');
    var noPeriodo = (j.serie || []).reduce(function (s, l) { return s + Number(l.visitas || 0); }, 0);
    ficha('fichas', numero(noPeriodo), 'no período', '');

    var v = j.voz || {};
    $('fichas-voz').innerHTML = '';
    ficha('fichas-voz', numero(v.recados), 'recados', 'voz');
    ficha('fichas-voz', numero(v.conversas), 'conversas', 'voz');
    ficha('fichas-voz', numero(v.por_atender), 'por atender', 'voz');
    ficha('fichas-voz', numero(v.para_humano), 'querem pessoa real', 'voz');

    desenharTempo(j.serie || []);
    desenharAfiliados(j.por_afiliado || []);
  }

  function ficha(onde, valor, rotulo, classe) {
    var div = document.createElement('div');
    div.className = 'ficha ' + (classe || '');
    var a = document.createElement('div'); a.className = 'valor'; a.textContent = valor;
    var b = document.createElement('div'); b.className = 'rotulo'; b.textContent = rotulo;
    div.appendChild(a); div.appendChild(b);
    $(onde).appendChild(div);
  }

  var COMUM = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: '#8d8d8d', boxWidth: 10, font: { family: 'Inter', size: 11 } } },
      tooltip: {
        backgroundColor: '#1b1b1b', borderColor: '#333', borderWidth: 1,
        titleColor: '#f0f0f0', bodyColor: '#c9c9c9', padding: 10,
      },
    },
    scales: {
      x: { grid: { color: '#1e1e1e' }, ticks: { color: '#6a6a6a', font: { family: 'Inter', size: 10 }, maxRotation: 0, autoSkipPadding: 18 } },
      y: { beginAtZero: true, grid: { color: '#1e1e1e' }, ticks: { color: '#6a6a6a', precision: 0, font: { family: 'Inter', size: 10 } } },
    },
  };

  function desenharTempo(serie) {
    var etiquetas = serie.map(function (l) { return l.dia.slice(8) + '/' + l.dia.slice(5, 7); });
    var dados = {
      labels: etiquetas,
      datasets: [
        { label: 'pessoas', data: serie.map(function (l) { return l.visitas; }),
          borderColor: '#c9a962', backgroundColor: 'rgba(201,169,98,0.14)', fill: true, tension: 0.3, pointRadius: 2 },
        { label: 'aparelhos distintos', data: serie.map(function (l) { return l.aparelhos; }),
          borderColor: '#7fb2ff', backgroundColor: 'transparent', tension: 0.3, pointRadius: 2 },
        { label: 'robôs', data: serie.map(function (l) { return l.robos; }),
          borderColor: '#555', backgroundColor: 'transparent', borderDash: [4, 4], tension: 0.3, pointRadius: 0 },
      ],
    };
    if (graficoTempo) { graficoTempo.data = dados; graficoTempo.update(); return; }
    graficoTempo = new Chart($('g-tempo'), { type: 'line', data: dados, options: COMUM });
  }

  function desenharAfiliados(lista) {
    var dados = {
      labels: lista.map(function (l) { return 'A' + (l.afiliado_num || 0); }),
      datasets: [{
        label: 'aberturas', data: lista.map(function (l) { return l.visitas; }),
        backgroundColor: 'rgba(201,169,98,0.5)', borderColor: '#c9a962', borderWidth: 1,
      }],
    };
    if (graficoAfiliado) { graficoAfiliado.data = dados; graficoAfiliado.update(); return; }
    graficoAfiliado = new Chart($('g-afiliado'), { type: 'bar', data: dados, options: COMUM });
  }

  // ------------------------------------------------------------------ registo
  async function carregarVisitas(continuar) {
    var p = parametros();
    p.set('limite', '60');
    if (continuar && estado.ultimoId) p.set('antes', estado.ultimoId);
    var j = await pedir('/api/visitas?' + p.toString());
    if (!j || !j.ok) return;
    var corpo = $('t-visitas');
    if (!continuar) corpo.innerHTML = '';
    if (!j.visitas.length && !continuar) {
      var tr = document.createElement('tr');
      var td = document.createElement('td');
      td.colSpan = 6; td.className = 'vazio'; td.textContent = 'Ainda não há aberturas.';
      tr.appendChild(td); corpo.appendChild(tr);
      $('b-mais').style.display = 'none';
      return;
    }
    $('b-mais').style.display = j.visitas.length < 60 ? 'none' : '';
    for (var i = 0; i < j.visitas.length; i++) {
      corpo.appendChild(linhaVisita(j.visitas[i]));
      estado.ultimoId = j.visitas[i].id;
    }
  }

  function linhaVisita(v) {
    var tr = document.createElement('tr');
    function td(conteudo, classe) {
      var c = document.createElement('td');
      if (classe) {
        var s = document.createElement('span');
        s.className = 'etiqueta ' + classe;
        s.textContent = conteudo;
        c.appendChild(s);
      } else c.textContent = conteudo;
      tr.appendChild(c);
      return c;
    }
    td(quando(v.ts));
    td((v.dono_num || '?') + ' · ' + (v.afiliado_num || '?'));
    td(v.robo ? 'robô' : v.origem, v.robo ? 'et-robo' : 'et-' + v.origem);
    td(v.dispositivo);
    td(texto(v.pais) || '·');
    td(v.tem_aparelho ? v.aparelho : '·');
    return tr;
  }

  // ------------------------------------------------------------------ afiliados
  async function carregarAfiliados(q) {
    var p = new URLSearchParams();
    if (q) p.set('q', q);
    p.set('limite', '150');
    var j = await pedir('/api/afiliados?' + p.toString());
    if (!j || !j.ok) return;
    var corpo = $('t-afiliados');
    corpo.innerHTML = '';
    if (!j.afiliados.length) {
      var tr = document.createElement('tr');
      var td = document.createElement('td');
      td.colSpan = 5; td.className = 'vazio';
      td.textContent = 'Nenhum afiliado. Reserve uma folha no gerador e os números aparecem aqui.';
      tr.appendChild(td); corpo.appendChild(tr);
      return;
    }
    for (var i = 0; i < j.afiliados.length; i++) corpo.appendChild(linhaAfiliado(j.afiliados[i]));
  }

  function linhaAfiliado(a) {
    var tr = document.createElement('tr');

    var tdNum = document.createElement('td');
    tdNum.textContent = a.num;
    tr.appendChild(tdNum);

    var tdNome = document.createElement('td');
    var nome = document.createElement('input');
    nome.type = 'text';
    nome.value = texto(a.nome);
    nome.placeholder = 'por entregar';
    nome.style.width = '100%';
    tdNome.appendChild(nome);
    tr.appendChild(tdNome);

    var tdPessoa = document.createElement('td');
    var ligar = document.createElement('button');
    ligar.className = 'mini';
    ligar.textContent = a.pessoa_id ? ('Pessoa ' + a.pessoa_id) : 'ligar ao Pessoas';
    ligar.addEventListener('click', function () { abrirPessoa(a.num, nome.value, ligar); });
    tdPessoa.appendChild(ligar);
    tr.appendChild(tdPessoa);

    var tdLote = document.createElement('td');
    tdLote.textContent = a.lote_id ? ('#' + a.lote_id) : '·';
    tr.appendChild(tdLote);

    var tdAccao = document.createElement('td');
    var guardar = document.createElement('button');
    guardar.className = 'mini';
    guardar.textContent = 'guardar';
    guardar.addEventListener('click', async function () {
      guardar.disabled = true;
      var pid = ligar.dataset.pessoa || a.pessoa_id || null;
      var r = await pedir('/api/afiliados', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ num: a.num, nome: nome.value.trim() || null, pessoa_id: pid ? Number(pid) : null }),
      });
      guardar.textContent = (r && r.ok) ? 'guardado' : 'falhou';
      window.setTimeout(function () { guardar.textContent = 'guardar'; guardar.disabled = false; }, 1600);
    });
    tdAccao.appendChild(guardar);
    tr.appendChild(tdAccao);

    return tr;
  }

  // ------------------------------------------------------------------ ponte para o Pessoas
  var botaoLigarActual = null;

  function abrirPessoa(num, nome, botao) {
    estado.afiliadoEmEdicao = num;
    botaoLigarActual = botao;
    $('p-afiliado').textContent = num;
    $('q-pessoa').value = nome || '';
    $('r-pessoas').innerHTML = '';
    $('aviso-pessoa').textContent = '';
    $('m-pessoa').showModal();
    if (nome && nome.length > 1) procurarPessoas(nome);
  }

  var atrasoBusca = 0;
  async function procurarPessoas(q) {
    var j = await pedir('/api/pessoas?q=' + encodeURIComponent(q));
    var caixa = $('r-pessoas');
    caixa.innerHTML = '';
    if (!j) return;
    if (!j.ok) {
      $('aviso-pessoa').textContent = j.erro === 'sem_ligacao'
        ? 'A ligação ao Pessoas não está configurada neste servidor.'
        : 'O Pessoas não respondeu. Tente outra vez.';
      return;
    }
    if (!j.pessoas.length) {
      caixa.innerHTML = '<p class="aviso">Ninguém com esse nome. Pode criar em baixo.</p>';
      return;
    }
    for (var i = 0; i < j.pessoas.length; i++) caixa.appendChild(linhaPessoa(j.pessoas[i]));
  }

  function linhaPessoa(p) {
    var div = document.createElement('div');
    div.className = 'resultado';
    var texto2 = document.createElement('div');
    var n = document.createElement('div'); n.className = 'nome'; n.textContent = p.nome;
    var t = document.createElement('div'); t.className = 'titulo'; t.textContent = p.titulo || ('id ' + p.id);
    texto2.appendChild(n); texto2.appendChild(t);
    div.appendChild(texto2);
    var b = document.createElement('button');
    b.className = 'mini';
    b.style.marginLeft = 'auto';
    b.textContent = 'escolher';
    b.addEventListener('click', function () { escolherPessoa(p.id, p.nome); });
    div.appendChild(b);
    return div;
  }

  async function escolherPessoa(id, nome) {
    var r = await pedir('/api/afiliados', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ num: estado.afiliadoEmEdicao, nome: nome, pessoa_id: id }),
    });
    if (r && r.ok) {
      if (botaoLigarActual) {
        botaoLigarActual.textContent = 'Pessoa ' + id;
        botaoLigarActual.dataset.pessoa = String(id);
        var linha = botaoLigarActual.closest('tr');
        var campo = linha ? linha.querySelector('input[type=text]') : null;
        if (campo) campo.value = nome;
      }
      $('m-pessoa').close();
    } else {
      $('aviso-pessoa').textContent = 'Não consegui guardar.';
    }
  }

  // ------------------------------------------------------------------ ligacoes
  function ligar() {
    $('f-dono').addEventListener('change', function () { estado.dono = this.value; recarregar(); });
    $('f-afiliado').addEventListener('change', function () { estado.afiliado = this.value; recarregar(); });
    $('f-dias').addEventListener('change', function () { estado.dias = Number(this.value); carregarEstatisticas(); });
    $('b-limpar').addEventListener('click', function () {
      estado.dono = ''; estado.afiliado = '';
      $('f-dono').value = ''; $('f-afiliado').value = '';
      recarregar();
    });
    $('b-mais').addEventListener('click', function () { carregarVisitas(true); });

    $('b-gerador').addEventListener('click', function () {
      var marco = $('if-gerador');
      if (!marco.src) marco.src = '/painel/gerador';
      $('m-gerador').showModal();
    });
    $('m-gerador').addEventListener('close', function () { carregarAfiliados(''); carregarEstatisticas(); });

    $('b-afiliados').addEventListener('click', function () {
      carregarAfiliados($('q-afiliado').value.trim());
      $('m-afiliados').showModal();
    });
    $('q-afiliado').addEventListener('input', function () {
      var v = this.value.trim();
      window.clearTimeout(atrasoBusca);
      atrasoBusca = window.setTimeout(function () { carregarAfiliados(v); }, 300);
    });

    $('b-dono').addEventListener('click', function () { $('aviso-dono').textContent = ''; $('m-dono').showModal(); });
    $('b-criar-dono').addEventListener('click', async function () {
      var nome = $('n-dono').value.trim();
      if (nome.length < 2) { $('aviso-dono').textContent = 'Falta o nome.'; return; }
      var r = await pedir('/api/donos', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nome: nome, tipo: $('n-tipo').value }),
      });
      if (r && r.ok) {
        $('aviso-dono').textContent = 'Criado com o número ' + r.num + '. Já pode imprimir cartões dele.';
        $('n-dono').value = '';
        carregarDonos();
      } else {
        $('aviso-dono').textContent = 'Não consegui criar.';
      }
    });

    $('q-pessoa').addEventListener('input', function () {
      var v = this.value.trim();
      window.clearTimeout(atrasoBusca);
      if (v.length < 2) { $('r-pessoas').innerHTML = ''; return; }
      atrasoBusca = window.setTimeout(function () { procurarPessoas(v); }, 320);
    });
    $('b-criar-pessoa').addEventListener('click', async function () {
      var nome = $('q-pessoa').value.trim();
      if (nome.length < 2) { $('aviso-pessoa').textContent = 'Falta o nome.'; return; }
      $('b-criar-pessoa').disabled = true;
      var r = await pedir('/api/pessoas', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nome: nome }),
      });
      $('b-criar-pessoa').disabled = false;
      if (r && r.ok && r.id) escolherPessoa(r.id, nome);
      else $('aviso-pessoa').textContent = 'Não consegui criar no Pessoas.';
    });
  }

  async function carregarDonos() {
    var j = await pedir('/api/donos');
    if (!j || !j.ok) return;
    var sel = $('f-dono');
    var valor = sel.value;
    sel.innerHTML = '<option value="">todos</option>';
    for (var i = 0; i < j.donos.length; i++) {
      var o = document.createElement('option');
      o.value = j.donos[i].num;
      o.textContent = j.donos[i].num + ' · ' + j.donos[i].nome;
      sel.appendChild(o);
    }
    sel.value = valor;
  }

  function recarregar() {
    estado.ultimoId = null;
    carregarEstatisticas();
    carregarVisitas(false);
  }

  ligar();
  carregarDonos();
  recarregar();
})();
