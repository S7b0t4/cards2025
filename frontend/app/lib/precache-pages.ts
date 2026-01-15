// Утилита для предзагрузки страниц в Service Worker

export const precachePages = async (pages: string[] = ['/', '/cards', '/practice', '/auth']) => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage({
        type: 'CACHE_PAGES',
        pages: pages,
      });
      console.log('[Precache] Sent pages to cache:', pages);
    }
  } catch (error) {
    console.error('[Precache] Error:', error);
  }
};

// Автоматическая предзагрузка при загрузке приложения
export const autoPrecache = () => {
  if (typeof window === 'undefined') return;

  // Предзагружаем страницы после небольшой задержки
  setTimeout(() => {
    precachePages();
  }, 3000);
};
