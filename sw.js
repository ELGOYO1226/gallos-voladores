// Para jugar sin internet después de la primera vez: guarda lo que se va bajando.
// Con internet siempre pide la versión nueva primero (así llegan los cambios); sin internet usa lo guardado.
// cache: 'no-cache' = le pregunta a GitHub si cambió el archivo aunque el navegador lo tenga guardado
// (si no, el celular seguía jugando la versión vieja hasta 10 minutos o más).
const CAJA = 'gallos-v2';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(cajas => Promise.all(cajas.filter(c => c !== CAJA).map(c => caches.delete(c))))
    .then(() => self.clients.claim())
));

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request.url, { cache: 'no-cache' })
      .then(r => {
        if (r.ok) { const copia = r.clone(); caches.open(CAJA).then(c => c.put(e.request, copia)); }
        return r;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
