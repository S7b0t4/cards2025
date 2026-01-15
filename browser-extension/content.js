// content.js - выполняется на страницах telegra.ph

console.log('[Telegraph Image Parser] content script loaded');

function getArticleTitle() {
  // Пытаемся найти заголовок в header.tl_article_header h1
  const header = document.querySelector('header.tl_article_header h1');
  if (header && header.textContent) {
    return header.textContent.trim();
  }
  // fallback — обычный document.title
  return document.title || '';
}

// Проверяем размер и валидность картинки через HEAD запрос
async function validateImage(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    
    if (!response.ok) {
      return {
        valid: false,
        error: `HTTP ${response.status}`,
        size: null,
      };
    }

    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type') || '';
    const size = contentLength ? parseInt(contentLength, 10) : null;

    // Проверяем, что это действительно картинка
    const isImage = contentType.startsWith('image/') || 
                    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url);

    return {
      valid: isImage && size !== null && size > 0,
      size: size,
      contentType: contentType,
      error: !isImage ? 'Not an image' : (size === 0 ? 'Empty file' : null),
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
      size: null,
    };
  }
}

async function parseImages() {
  // Ищем все figure с картинками
  const figures = Array.from(document.querySelectorAll('figure'));

  const images = [];
  
  for (let index = 0; index < figures.length; index++) {
    const figure = figures[index];
    const img = figure.querySelector('img');
    if (!img) continue;

    const captionEl = figure.querySelector('figcaption');
    const caption = captionEl ? captionEl.textContent.trim() : '';

    // Валидируем картинку
    const validation = await validateImage(img.src);

    images.push({
      index,
      src: img.src,
      alt: img.alt || '',
      caption,
      validation: {
        valid: validation.valid,
        size: validation.size,
        sizeFormatted: validation.size ? formatBytes(validation.size) : null,
        error: validation.error,
      },
    });
  }

  return {
    url: window.location.href,
    title: getArticleTitle(),
    count: images.length,
    images,
  };
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Слушаем сообщения от popup / background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'parseImages') {
    // Асинхронная обработка
    parseImages()
      .then((data) => {
        sendResponse({ success: true, data });
      })
      .catch((error) => {
        console.error('[Telegraph Image Parser] parse error', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Асинхронный ответ
  }
});





