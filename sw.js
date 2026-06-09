// ════════════════════════════════════════════════════════════
//  Service Worker — Roteiro Chile 2026
//  Estratégia: Cache First com fallback para rede
//  Permite uso offline após primeira visita
// ════════════════════════════════════════════════════════════

const CACHE_NAME = 'chile-2026-v2';
const ASSETS = [
  '/roteiro-chile-2026.html',
  '/manifest.json',
];

// Instala e pré-cacheia os assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cacheando assets...');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Ativa e limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Removendo cache antigo:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// Intercepta requisições — Network First para assets, pass-through para APIs
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Requisições para APIs externas — sempre rede, sem cache
  if (url.hostname !== location.hostname) {
    return;
  }

  // Assets locais — Network First: busca versão nova na rede;
  // só usa cache se estiver offline (garante sempre o HTML atualizado)
  event.respondWith(
    fetch(event.request).then((response) => {
      // Atualiza o cache com a versão mais recente
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => {
      // Sem rede — usa cache como fallback offline
      console.log('[SW] Offline — servindo do cache:', event.request.url);
      return caches.match(event.request)
        .then((cached) => cached || caches.match('/roteiro-chile-2026.html'));
    })
  );
});
