// ════════════════════════════════════════════════════════════
//  Service Worker — Roteiro Chile 2026
//  Estratégia: Cache First com fallback para rede
//  Permite uso offline após primeira visita
// ════════════════════════════════════════════════════════════

const CACHE_NAME = 'chile-2026-v1';
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

// Intercepta requisições — Cache First para assets, Network First para API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Requisições para APIs externas (AeroDataBox, etc.) — sempre rede
  if (url.hostname !== location.hostname) {
    return; // deixa passar para a rede normalmente
  }

  // Assets locais — Cache First
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // Cacheia a resposta para próxima vez
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline e sem cache — retorna página principal como fallback
        return caches.match('/roteiro-chile-2026.html');
      });
    })
  );
});
