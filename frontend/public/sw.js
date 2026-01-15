// Service Worker для PWA с автоматическим кешированием
const CACHE_NAME = 'cards-app-v4';
const RUNTIME_CACHE = 'cards-runtime-v4';

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache opened');
        return cache;
      })
  );
  self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const request = event.request;

  // Пропускаем запросы к API - они обрабатываются через IndexedDB
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Для всех остальных запросов используем стратегию "Network First, Cache Fallback"
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Кешируем все успешные ответы
        if (response.status === 200 && request.method === 'GET') {
          const responseToCache = response.clone();
          const cacheToUse = url.pathname.startsWith('/_next/') ? RUNTIME_CACHE : CACHE_NAME;
          
          caches.open(cacheToUse).then((cache) => {
            cache.put(request, responseToCache);
            console.log('[SW] Cached:', url.pathname);
          });
        }
        return response;
      })
      .catch(() => {
        // Если сеть недоступна, ищем в кеше
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Serving from cache:', url.pathname);
            return cachedResponse;
          }

          // Если это навигационный запрос и нет в кеше, возвращаем главную страницу
          if (request.mode === 'navigate' || 
              (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))) {
            return caches.match('/').then((indexResponse) => {
              if (indexResponse) {
                return indexResponse;
              }
              // Если даже главной нет, возвращаем базовый HTML
              return new Response(
                '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline</title></head><body><h1>Офлайн режим</h1><p>Пожалуйста, подключитесь к интернету для первого запуска.</p></body></html>',
                {
                  headers: { 'Content-Type': 'text/html' }
                }
              );
            });
          }

          // Для остальных ресурсов возвращаем ошибку
          return new Response('Resource not available offline', { status: 503 });
        });
      })
  );
});

// Предзагрузка страниц при установке
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_PAGES') {
    const pages = event.data.pages || ['/', '/cards', '/practice', '/auth'];
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return Promise.all(
          pages.map((page) => {
            return fetch(page)
              .then((response) => {
                if (response.status === 200) {
                  return cache.put(page, response);
                }
              })
              .catch(() => {
                console.log('[SW] Failed to pre-cache:', page);
              });
          })
        );
      })
    );
  }
});
