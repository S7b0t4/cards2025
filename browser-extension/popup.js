// popup.js - UI логика для парсинга картинок

document.addEventListener('DOMContentLoaded', () => {
  const parseBtn = document.getElementById('parseBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const copyBtn = document.getElementById('copyBtn');
  const statusEl = document.getElementById('status');
  const imagesContainer = document.getElementById('imagesContainer');
  const countPill = document.getElementById('countPill');
  const progressEl = document.getElementById('progress');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const progressDetails = document.getElementById('progressDetails');
  const folderInput = document.getElementById('folderInput');
  const saveFolderBtn = document.getElementById('saveFolderBtn');
  const savedFolderInfo = document.getElementById('savedFolderInfo');

  function setStatus(message, type = 'info') {
    statusEl.textContent = message;
    statusEl.className = `status show ${type}`;
  }

  function setCount(count) {
    countPill.textContent = `${count} картинок`;
  }

  function renderImages(data) {
    imagesContainer.innerHTML = '';

    if (!data || !Array.isArray(data.images) || data.images.length === 0) {
      imagesContainer.innerHTML = '<div class="small">Картинок не найдено.</div>';
      setCount(0);
      return;
    }

    const validCount = data.images.filter(img => img.validation && img.validation.valid).length;
    const invalidCount = data.images.length - validCount;
    
    setCount(data.images.length);

    // Показываем статистику валидации
    if (invalidCount > 0) {
      const statsDiv = document.createElement('div');
      statsDiv.style.cssText = 'padding: 6px; margin-bottom: 8px; border-radius: 4px; background: rgba(220, 38, 38, 0.1); border: 1px solid rgba(220, 38, 38, 0.3); font-size: 10px;';
      statsDiv.innerHTML = `⚠️ Проблемных картинок: <strong>${invalidCount}</strong> из ${data.images.length}`;
      imagesContainer.appendChild(statsDiv);
    }

    data.images.forEach((img) => {
      const div = document.createElement('div');
      div.className = 'image-item';
      
      // Выделяем проблемные картинки
      if (img.validation && !img.validation.valid) {
        div.style.borderLeft = '3px solid #ef4444';
        div.style.paddingLeft = '8px';
        div.style.background = 'rgba(220, 38, 38, 0.05)';
      }

      const headerDiv = document.createElement('div');
      headerDiv.style.cssText = 'display: flex; align-items: center; gap: 6px; margin-bottom: 4px;';

      const indexSpan = document.createElement('span');
      indexSpan.className = 'image-index';
      indexSpan.textContent = `#${img.index + 1}`;

      // Индикатор валидности
      if (img.validation) {
        const statusIcon = document.createElement('span');
        statusIcon.textContent = img.validation.valid ? '✓' : '✗';
        statusIcon.style.cssText = `font-weight: bold; color: ${img.validation.valid ? '#22c55e' : '#ef4444'};`;
        headerDiv.appendChild(statusIcon);
      }

      headerDiv.appendChild(indexSpan);

      // Размер файла
      if (img.validation && img.validation.sizeFormatted) {
        const sizeSpan = document.createElement('span');
        sizeSpan.style.cssText = 'font-size: 10px; color: #6b7280;';
        sizeSpan.textContent = img.validation.sizeFormatted;
        headerDiv.appendChild(sizeSpan);
      }

      div.appendChild(headerDiv);

      const urlSpan = document.createElement('span');
      urlSpan.className = 'image-url';
      urlSpan.textContent = img.src;
      urlSpan.style.display = 'block';
      urlSpan.style.marginTop = '2px';
      urlSpan.addEventListener('click', () => {
        navigator.clipboard.writeText(img.src).then(() => {
          setStatus('URL картинки скопирован в буфер', 'success');
        });
      });

      div.appendChild(urlSpan);

      // Показываем ошибку валидации
      if (img.validation && img.validation.error) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'margin-top: 4px; font-size: 10px; color: #ef4444;';
        errorDiv.textContent = `⚠️ ${img.validation.error}`;
        div.appendChild(errorDiv);
      }

      if (img.caption) {
        const captionDiv = document.createElement('div');
        captionDiv.className = 'image-caption';
        captionDiv.textContent = img.caption;
        div.appendChild(captionDiv);
      }

      imagesContainer.appendChild(div);
    });
  }

  function saveToStorage(data) {
    chrome.runtime.sendMessage(
      {
        action: 'saveParsedImages',
        data,
      },
      () => {}
    );
  }

  function loadFromStorage() {
    chrome.runtime.sendMessage(
      {
        action: 'getParsedImages',
      },
      (response) => {
        if (response && response.success && response.data) {
          renderImages(response.data);
        }
      }
    );
  }

  parseBtn.addEventListener('click', async () => {
    setStatus('Парсим и валидируем картинки... (это может занять время)', 'info');
    parseBtn.disabled = true;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.url || !tab.url.startsWith('https://telegra.ph/')) {
        setStatus('Откройте страницу на telegra.ph и попробуйте снова.', 'error');
        parseBtn.disabled = false;
        return;
      }

      chrome.tabs.sendMessage(
        tab.id,
        { action: 'parseImages' },
        (response) => {
          parseBtn.disabled = false;
          
          if (chrome.runtime.lastError) {
            setStatus('Ошибка: ' + chrome.runtime.lastError.message, 'error');
            return;
          }

          if (!response || !response.success) {
            setStatus('Не удалось распарсить: ' + (response && response.error ? response.error : 'нет ответа'), 'error');
            return;
          }

          const validCount = response.data.images.filter(img => img.validation && img.validation.valid).length;
          const invalidCount = response.data.images.length - validCount;
          
          renderImages(response.data);
          saveToStorage(response.data);
          
          if (invalidCount > 0) {
            setStatus(`Готово: ${response.data.count} картинок (${invalidCount} с проблемами)`, 'error');
          } else {
            setStatus(`Готово: ${response.data.count} картинок, все валидны ✓`, 'success');
          }
        }
      );
    } catch (e) {
      parseBtn.disabled = false;
      setStatus('Ошибка: ' + e.message, 'error');
    }
  });

  copyBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage(
      {
        action: 'getParsedImages',
      },
      (response) => {
        if (!response || !response.success || !response.data || !Array.isArray(response.data.images) || response.data.images.length === 0) {
          setStatus('Нет данных для копирования. Сначала нажмите «Парсить картинки».', 'error');
          return;
        }

        const urls = response.data.images.map((img) => img.src).join('\n');
        navigator.clipboard.writeText(urls).then(
          () => {
            setStatus('Список URL скопирован в буфер обмена.', 'success');
          },
          (err) => {
            setStatus('Не удалось скопировать: ' + err.message, 'error');
          }
        );
      }
    );
  });

  downloadBtn.addEventListener('click', async () => {
    downloadBtn.disabled = true;
    
    chrome.runtime.sendMessage(
      {
        action: 'getParsedImages',
      },
      (response) => {
        if (!response || !response.success || !response.data || !Array.isArray(response.data.images) || response.data.images.length === 0) {
          setStatus('Нет данных для загрузки. Сначала нажмите «Парсить картинки».', 'error');
          downloadBtn.disabled = false;
          return;
        }

        // Фильтруем только валидные картинки (опционально)
        const validImages = response.data.images.filter(img => 
          !img.validation || img.validation.valid !== false
        );

        if (validImages.length === 0) {
          setStatus('Нет валидных картинок для скачивания.', 'error');
          downloadBtn.disabled = false;
          return;
        }

        if (validImages.length < response.data.images.length) {
          setStatus(`Скачиваю ${validImages.length} валидных картинок из ${response.data.images.length}...`, 'info');
        } else {
          setStatus(`Начинаю скачивание ${validImages.length} картинок...`, 'info');
        }

        const dataToDownload = {
          ...response.data,
          images: validImages,
        };

        chrome.runtime.sendMessage(
          {
            action: 'downloadImages',
            data: dataToDownload,
          },
          (resp) => {
            if (!resp || !resp.success) {
              downloadBtn.disabled = false;
              setStatus('Ошибка загрузки: ' + (resp && resp.error ? resp.error : 'нет ответа'), 'error');
              return;
            }

            // Показываем прогресс
            progressEl.style.display = 'block';
            setStatus(resp.message || `Скачивание запущено. Папка: ${resp.folder}`, 'info');
            
            // Обновляем прогресс каждую секунду
            const progressInterval = setInterval(() => {
              chrome.runtime.sendMessage(
                { action: 'getDownloadProgress' },
                (progressResp) => {
                  if (progressResp && progressResp.success && progressResp.progress) {
                    const prog = progressResp.progress;
                    const percent = prog.total > 0 ? Math.round((prog.completed / prog.total) * 100) : 0;
                    
                    progressBar.style.width = percent + '%';
                    progressText.textContent = `${prog.completed}/${prog.total}`;
                    progressDetails.textContent = `Активных: ${prog.active || 0} | Успешно: ${prog.completed - (prog.failed || 0)} | Ошибок: ${prog.failed || 0}`;
                    
                    // Если всё скачано
                    if (prog.completed >= prog.total && prog.total > 0) {
                      clearInterval(progressInterval);
                      downloadBtn.disabled = false;
                      progressEl.style.display = 'none';
                      setStatus(`Готово! Скачано ${prog.completed - (prog.failed || 0)} из ${prog.total} картинок. Папка: ${resp.folder}`, 'success');
                    }
                  }
                }
              );
            }, 1000);
            
            // Останавливаем обновление через 5 минут (на случай если что-то зависнет)
            setTimeout(() => {
              clearInterval(progressInterval);
              downloadBtn.disabled = false;
            }, 5 * 60 * 1000);
          }
        );
      }
    );
  });

  // Загружаем сохраненную папку
  function loadSavedFolder() {
    chrome.storage.local.get(['savedDownloadFolder'], (result) => {
      if (result.savedDownloadFolder) {
        folderInput.value = result.savedDownloadFolder;
        savedFolderInfo.textContent = `Сохранено: ${result.savedDownloadFolder}`;
        savedFolderInfo.style.display = 'block';
        savedFolderInfo.style.color = '#22c55e';
      }
    });
  }

  // Сохраняем папку
  saveFolderBtn.addEventListener('click', () => {
    const folder = folderInput.value.trim();
    if (!folder) {
      setStatus('Введите название папки', 'error');
      return;
    }

    // Очищаем название папки от недопустимых символов
    const sanitizeFolder = (name) => {
      return name
        .replace(/[<>:"/\\|?*]/g, '') // Убираем недопустимые символы
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    };

    const sanitized = sanitizeFolder(folder);
    if (!sanitized) {
      setStatus('Название папки содержит только недопустимые символы', 'error');
      return;
    }

    chrome.storage.local.set({ savedDownloadFolder: sanitized }, () => {
      folderInput.value = sanitized;
      savedFolderInfo.textContent = `Сохранено: ${sanitized}`;
      savedFolderInfo.style.display = 'block';
      savedFolderInfo.style.color = '#22c55e';
      setStatus('Папка сохранена!', 'success');
    });
  });

  // При открытии popup пробуем показать последние сохранённые данные
  loadFromStorage();
  loadSavedFolder();
});





