/* Service worker do cartao. Existe por um requisito dele: "tem de dar para não precisar de rede".
 *
 * O ambito e SO /c/, e e por isso que este ficheiro e servido em /c/sw.js e nao da pasta /cartao/:
 * um service worker so manda em caminhos abaixo de onde e servido. Assim, se alguma coisa aqui
 * correr mal, o site da empresa nao e afectado de maneira nenhuma.
 *
 * Regras:
 *  - a pagina do cartao vai a rede primeiro e so usa a copia se a rede falhar (a informacao pode
 *    ter mudado, e uma copia velha de um cartao e pior do que um cartao lento);
 *  - o que e sempre igual (folha de estilo, codigo, bibliotecas) sai da copia primeiro;
 *  - nada do que comeca por /api/ e guardado, nunca. Sao dados de pessoas e respostas em curso.
 */
var CAIXA = 'cartao-v1';
var ESSENCIAIS = [
  '/cartao/cartao.css',
  '/cartao/cartao.js',
  '/cartao/vendor/idb-keyval.umd.js',
  '/cartao/vendor/wavesurfer.min.js',
];

self.addEventListener('install', function (ev) {
  ev.waitUntil(
    caches.open(CAIXA).then(function (c) { return c.addAll(ESSENCIAIS); }).catch(function () {})
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(
    caches.keys().then(function (nomes) {
      return Promise.all(nomes.map(function (n) { return n === CAIXA ? null : caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (ev) {
  var pedido = ev.request;
  if (pedido.method !== 'GET') return;
  var url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('/api/') === 0) return;

  if (pedido.mode === 'navigate') {
    ev.respondWith(
      fetch(pedido).then(function (r) {
        var copia = r.clone();
        caches.open(CAIXA).then(function (c) { c.put(pedido, copia); }).catch(function () {});
        return r;
      }).catch(function () {
        return caches.match(pedido).then(function (c) {
          return c || new Response('<!doctype html><meta charset="utf-8"><title>Sem rede</title>'
            + '<body style="background:#0a0a0a;color:#f5f5f5;font-family:system-ui;padding:2rem">'
            + '<h1>Sem rede</h1><p>Abra outra vez quando tiver ligação.</p>',
            { headers: { 'content-type': 'text/html; charset=utf-8' }, status: 503 });
        });
      })
    );
    return;
  }

  ev.respondWith(
    caches.match(pedido).then(function (c) {
      if (c) return c;
      return fetch(pedido).then(function (r) {
        if (r && r.status === 200 && (url.pathname.indexOf('/cartao/') === 0)) {
          var copia = r.clone();
          caches.open(CAIXA).then(function (cc) { cc.put(pedido, copia); }).catch(function () {});
        }
        return r;
      });
    })
  );
});
