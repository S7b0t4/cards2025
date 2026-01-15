#!/usr/bin/env node

// Простое CLI-приложение для скачивания списка картинок в папку frontend/public/<folderName>
// Использует только стандартные модули Node.js (Node 20+, есть глобальный fetch).

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Абсолютный путь к public Next.js фронтенда
const FRONTEND_PUBLIC_DIR = '/home/sybota/proj/frontend/public';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadImage(url, destPath, attempt = 1, maxAttempts = 3) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд таймаут

    const res = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
      }
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    if (!res.body) {
      throw new Error('No response body');
    }

    const contentLengthHeader = res.headers.get('content-length');
    const expectedLength = contentLengthHeader ? Number(contentLengthHeader) : null;

    // Удаляем файл, если он уже существует (для повторной попытки)
    try {
      await fs.promises.unlink(destPath);
    } catch {
      // Игнорируем, если файла нет
    }

    const fileStream = fs.createWriteStream(destPath);
    let downloaded = 0;

    await new Promise((resolve, reject) => {
      // Используем ReadableStream для Node.js
      const reader = res.body.getReader();

      function pump() {
        reader.read().then(({ done, value }) => {
          if (done) {
            fileStream.end();
            return;
          }

          downloaded += value.length;
          const ok = fileStream.write(value);
          if (!ok) {
            fileStream.once('drain', pump);
          } else {
            pump();
          }
        }).catch((err) => {
          reader.cancel().catch(() => {});
          fileStream.destroy();
          reject(err);
        });
      }

      fileStream.on('error', (err) => {
        reader.cancel().catch(() => {});
        reject(err);
      });

      fileStream.on('finish', () => {
        // Базовая проверка: файл не должен быть пустым
        // Детальная валидация уже сделана в расширении браузера
        fs.promises.stat(destPath).then((stats) => {
          const actualSize = stats.size;
          
          if (actualSize === 0) {
            reject(new Error('empty file (0 bytes)'));
            return;
          }

          // Если файл меньше ожидаемого более чем на 10% - это проблема
          if (expectedLength !== null && actualSize < expectedLength * 0.9) {
            reject(
              new Error(
                `file too small: downloaded=${actualSize}, expected=${expectedLength} (missing ${expectedLength - actualSize} bytes)`
              )
            );
            return;
          }

          resolve();
        }).catch(reject);
      });

      pump();
    });

    return { ok: true };
  } catch (err) {
    // Удаляем битый файл
    try {
      await fs.promises.unlink(destPath);
    } catch {
      // Игнорируем ошибки удаления
    }

    if (attempt < maxAttempts) {
      const delay = 1000 * attempt; // 1s, 2s, 3s
      console.warn(
        `  ⚠️  [retry ${attempt}/${maxAttempts}] ${path.basename(destPath)}: ${err.message} (через ${delay}ms)`
      );
      await sleep(delay);
      return downloadImage(url, destPath, attempt + 1, maxAttempts);
    }

    return { ok: false, error: err };
  }
}

// Транслитерация кириллицы в латиницу
function transliterate(text) {
  const map = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };
  
  return text
    .toLowerCase()
    .split('')
    .map(char => map[char] || char)
    .join('');
}

function sanitizeFolderName(name) {
  const transliterated = transliterate(name.trim());
  return transliterated
    .replace(/[^a-z0-9\-_ ]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'images';
}

async function main() {
  console.log('=== Telegraph Image Downloader ===');
  console.log('Складывает файлы в:', FRONTEND_PUBLIC_DIR);
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (q) =>
    new Promise((resolve) => {
      rl.question(q, (answer) => resolve(answer));
    });

  const folderInput = await question(
    'Введи название папки (например, заголовок статьи, можно по-русски): '
  );
  const folderName = sanitizeFolderName(folderInput);
  const targetDir = path.join(FRONTEND_PUBLIC_DIR, folderName);

  console.log('');
  console.log(
    'Теперь вставь список URL картинок (по одному в строке). Когда закончишь — нажми Ctrl+D:'
  );

  const urls = [];

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (trimmed) {
      urls.push(trimmed);
    }
  });

  rl.on('close', async () => {
    if (urls.length === 0) {
      console.log('URL не получены, выходим.');
      process.exit(0);
    }

    // Проверяем права доступа и создаём папку
    let finalTargetDir = targetDir;
    try {
      await fs.promises.mkdir(targetDir, { recursive: true });
      // Проверяем, что можем писать в папку
      const testFile = path.join(targetDir, '.write-test');
      await fs.promises.writeFile(testFile, 'test');
      await fs.promises.unlink(testFile);
    } catch (err) {
      if (err.code === 'EACCES' || err.code === 'EPERM') {
        console.warn('\n⚠️  Нет прав на запись в папку public.');
        console.warn(`   Папка ${FRONTEND_PUBLIC_DIR} принадлежит root.`);
        console.warn('\n   Используем альтернативную папку в домашней директории...');
        
        // Fallback: сохраняем в ~/Downloads/telegraph-images/
        const homeDir = process.env.HOME || process.env.USERPROFILE || __dirname;
        finalTargetDir = path.join(homeDir, 'Downloads', 'telegraph-images', folderName);
        
        try {
          await fs.promises.mkdir(finalTargetDir, { recursive: true });
          console.log(`   ✓ Создана папка: ${finalTargetDir}`);
          console.log('   После скачивания можешь переместить файлы вручную в public.\n');
        } catch (fallbackErr) {
          console.error('\n❌ Не удалось создать альтернативную папку.');
          console.error('\n   Решения для исправления прав:');
          console.error('   1. Запусти: sudo chown -R sybota:sybota /home/sybota/proj/frontend/public');
          console.error('   2. Или создай папку вручную:');
          console.error(`      sudo mkdir -p ${targetDir}`);
          console.error(`      sudo chown -R sybota:sybota ${targetDir}`);
          process.exit(1);
        }
      } else {
        throw err;
      }
    }

    console.log('');
    console.log(`Папка: ${finalTargetDir}`);
    console.log(`Картинок: ${urls.length}`);
    console.log('Начинаю скачивание...\n');

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const index = i + 1;
      const padded = String(index).padStart(3, '0');

      let ext = 'jpg';
      try {
        const u = new URL(url);
        const lastPart = u.pathname.split('/').pop() || '';
        const maybeExt = lastPart.split('.').pop();
        if (maybeExt && maybeExt.length <= 5) {
          ext = maybeExt;
        }
      } catch {
        // оставляем jpg
      }

      const filename = `${padded}.${ext}`;
      const destPath = path.join(finalTargetDir, filename);

      process.stdout.write(`[${index}/${urls.length}] ${filename}... `);

      const result = await downloadImage(url, destPath);
      if (result.ok) {
        successCount++;
        console.log('✓');
      } else {
        failCount++;
        console.log('✗');
        console.error(
          `     Ошибка: ${result.error?.message || result.error}`
        );
      }
    }

    console.log('\n=== Готово ===');
    console.log(`Успешно: ${successCount}`);
    console.log(`Ошибок:  ${failCount}`);
    console.log(`Путь к папке: ${finalTargetDir}`);
    
    if (finalTargetDir !== targetDir) {
      console.log(`\n💡 Файлы сохранены в альтернативную папку (нет прав на public).`);
      console.log(`   Чтобы переместить в public, выполни:`);
      console.log(`   sudo mv ${finalTargetDir} ${targetDir}`);
      console.log(`   sudo chown -R sybota:sybota ${targetDir}`);
    }

    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Фатальная ошибка:', err);
  process.exit(1);
});


