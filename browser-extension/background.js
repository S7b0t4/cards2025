// background.js - сервис-воркер расширения

console.log('[Telegraph Image Parser] background worker started');

// Хранилище для отслеживания скачиваний
const downloadTracker = new Map(); // downloadId -> { url, filename, expectedSize, attempts, maxAttempts, index, total }
const downloadProgress = { total: 0, completed: 0, failed: 0, active: 0 };

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Telegraph Image Parser] installed');
});

// Отслеживаем статус скачиваний
chrome.downloads.onChanged.addListener((downloadDelta) => {
  const downloadId = downloadDelta.id;
  const info = downloadTracker.get(downloadId);

  if (!info) return;

  // Если скачивание завершено
  if (downloadDelta.state && downloadDelta.state.current === 'complete') {
    // Проверяем размер файла
    chrome.downloads.search({ id: downloadId }, (results) => {
      if (results && results[0]) {
        const fileSize = results[0].totalBytes;
        const expectedSize = info.expectedSize;

        // Проверяем, что файл не пустой и размер примерно совпадает (допускаем 10% разницу)
        const isValid = fileSize > 0 && 
          (expectedSize === null || fileSize >= expectedSize * 0.9);

        if (!isValid && info.attempts < info.maxAttempts) {
          // Файл битый или неполный - удаляем и пробуем снова
          console.log(`[Retry] ${info.filename} - размер ${fileSize}, ожидалось ${expectedSize}, попытка ${info.attempts + 1}/${info.maxAttempts}`);
          
          chrome.downloads.removeFile(downloadId, () => {
            chrome.downloads.erase({ id: downloadId }, () => {
              // Повторная попытка
              setTimeout(() => {
                downloadImageWithRetry(info.url, info.filename, info.expectedSize, info.attempts + 1, info.maxAttempts);
              }, 1000 * info.attempts); // Задержка увеличивается с каждой попыткой
            });
          });
        } else if (!isValid) {
          // Превышено количество попыток
          console.error(`[Failed] ${info.filename} - не удалось скачать после ${info.maxAttempts} попыток`);
          downloadTracker.delete(downloadId);
          downloadProgress.failed++;
          downloadProgress.completed++;
          updateDownloadProgress();
        } else {
          // Всё ок
          console.log(`[Success] ${info.filename} - ${fileSize} bytes`);
          downloadTracker.delete(downloadId);
          downloadProgress.completed++;
          downloadProgress.active--;
          updateDownloadProgress();
        }
      }
    });
  }

  // Если скачивание провалилось
  if (downloadDelta.state && downloadDelta.state.current === 'interrupted') {
    if (info.attempts < info.maxAttempts) {
      console.log(`[Retry] ${info.filename} - прервано, попытка ${info.attempts + 1}/${info.maxAttempts}`);
      
      chrome.downloads.removeFile(downloadId, () => {
        chrome.downloads.erase({ id: downloadId }, () => {
          setTimeout(() => {
            downloadImageWithRetry(info.url, info.filename, info.expectedSize, info.attempts + 1, info.maxAttempts);
          }, 1000 * info.attempts);
        });
      });
    } else {
      console.error(`[Failed] ${info.filename} - прервано после ${info.maxAttempts} попыток`);
      downloadTracker.delete(downloadId);
      downloadProgress.failed++;
      downloadProgress.completed++;
      downloadProgress.active--;
      updateDownloadProgress();
    }
  }
});

// Обновляем прогресс скачивания
function updateDownloadProgress() {
  chrome.storage.local.set({ downloadProgress }, () => {});
}

// Функция скачивания с повторными попытками
function downloadImageWithRetry(url, filename, expectedSize, attempt = 1, maxAttempts = 3, index = null, total = null) {
  chrome.downloads.download(
    {
      url: url,
      filename: filename,
      conflictAction: 'uniquify',
      saveAs: false,
    },
    (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error(`[Error] ${filename}: ${chrome.runtime.lastError.message}`);
        if (attempt < maxAttempts) {
          setTimeout(() => {
            downloadImageWithRetry(url, filename, expectedSize, attempt + 1, maxAttempts, index, total);
          }, 1000 * attempt);
        } else {
          downloadProgress.failed++;
          downloadProgress.completed++;
          downloadProgress.active--;
          updateDownloadProgress();
        }
        return;
      }

      // Сохраняем информацию для отслеживания
      downloadTracker.set(downloadId, {
        url,
        filename,
        expectedSize,
        attempts: attempt,
        maxAttempts,
        index,
        total,
      });
    }
  );
}

// Параллельное скачивание с ограничением количества одновременных загрузок
async function downloadImagesParallel(images, folder, maxConcurrent = 5) {
  downloadProgress.total = images.length;
  downloadProgress.completed = 0;
  downloadProgress.failed = 0;
  downloadProgress.active = 0;
  updateDownloadProgress();

  // Создаём задачи для скачивания
  const tasks = images.map((img, index) => {
    return async () => {
      try {
        const url = new URL(img.src);
        const parts = url.pathname.split('.');
        const ext = parts.length > 1 ? parts[parts.length - 1].split('?')[0] : 'jpg';
        const filename = `${folder}/${String(index + 1).padStart(3, '0')}.${ext}`;
        const expectedSize = img.validation && img.validation.size ? img.validation.size : null;

        downloadProgress.active++;
        updateDownloadProgress();

        // Запускаем скачивание (не ждём завершения, оно отслеживается через onChanged)
        downloadImageWithRetry(img.src, filename, expectedSize, 1, 3, index + 1, images.length);
        
        // Небольшая задержка между запусками
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (err) {
        console.error(`[Error] Не удалось обработать картинку #${index + 1}:`, err);
        downloadProgress.failed++;
        downloadProgress.completed++;
        downloadProgress.active--;
        updateDownloadProgress();
      }
    };
  });

  // Запускаем задачи батчами по maxConcurrent
  for (let i = 0; i < tasks.length; i += maxConcurrent) {
    const batch = tasks.slice(i, i + maxConcurrent);
    await Promise.all(batch.map(task => task()));
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveParsedImages') {
    chrome.storage.local.set({ telegraphParsedImages: request.data }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'getParsedImages') {
    chrome.storage.local.get(['telegraphParsedImages'], (result) => {
      sendResponse({ success: true, data: result.telegraphParsedImages || null });
    });
    return true;
  }

  if (request.action === 'getDownloadProgress') {
    chrome.storage.local.get(['downloadProgress'], (result) => {
      sendResponse({ success: true, progress: result.downloadProgress || null });
    });
    return true;
  }

  if (request.action === 'downloadImages') {
    const data = request.data;
    if (!data || !Array.isArray(data.images) || data.images.length === 0) {
      sendResponse({ success: false, error: 'Нет картинок для загрузки' });
      return true;
    }

    const sanitizeTitle = (title) => {
      if (!title) return 'telegraph_images';
      // Транслитерация кириллицы
      const translitMap = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
      };
      
      const transliterated = title
        .toLowerCase()
        .split('')
        .map(char => translitMap[char] || char)
        .join('');
      
      const cleaned = transliterated
        .replace(/[^a-z0-9\-_ ]/gi, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      return cleaned || 'telegraph_images';
    };

    const folder = sanitizeTitle(data.title);

    // Параллельное скачивание (до 5 одновременно)
    (async () => {
      try {
        await downloadImagesParallel(data.images, folder, 5);

        sendResponse({ 
          success: true, 
          count: data.images.length, 
          folder,
          message: `Запущено параллельное скачивание ${data.images.length} картинок в папку "${folder}". Проверьте папку загрузок браузера.`
        });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    })();

    return true;
  }
});





