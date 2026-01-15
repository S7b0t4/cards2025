'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerSW = () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            console.log('[SW] Service Worker registered:', registration.scope);
            
            // Если Service Worker уже активен, предзагружаем страницы
            if (registration.active) {
              setTimeout(() => {
                registration.active?.postMessage({
                  type: 'CACHE_PAGES',
                  pages: ['/', '/cards', '/practice', '/auth'],
                });
              }, 2000);
            }
            
            // Принудительно обновляем Service Worker при изменении
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // Новый Service Worker установлен, перезагружаем страницу
                    window.location.reload();
                  }
                });
              }
            });
            
            // Проверяем обновления каждые 60 секунд
            setInterval(() => {
              registration.update();
            }, 60000);
          })
          .catch((error) => {
            console.error('[SW] Service Worker registration failed:', error);
          });
      };

      // Регистрируем сразу, не ждем load
      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
      }
    }
  }, []);

  return null;
}

