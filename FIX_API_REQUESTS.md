# Исправление запросов к API

## Проблема
Запросы идут на `/cards/statistics` вместо `/api/cards/statistics`, что приводит к 404 ошибке.

## Причина
Браузер использует кешированную версию JavaScript, где еще используется старый путь без `/api`.

## Решение

### 1. Очистите кеш браузера:

**Chrome/Edge:**
- Нажмите `Ctrl+Shift+R` (Windows/Linux) или `Cmd+Shift+R` (Mac) для жесткой перезагрузки
- Или `Ctrl+F5` (Windows/Linux)

**Firefox:**
- `Ctrl+Shift+R` или `Cmd+Shift+R`

**Или откройте в режиме инкогнито:**
- Chrome: `Ctrl+Shift+N` (Windows/Linux) или `Cmd+Shift+N` (Mac)
- Firefox: `Ctrl+Shift+P` (Windows/Linux) или `Cmd+Shift+P` (Mac)

### 2. Проверьте в консоли браузера (F12):

После очистки кеша должно быть:
```
[AXIOS REQUEST] {url: '/api/cards/statistics', ...}
```

А не:
```
[AXIOS REQUEST] {url: '/cards/statistics', ...}
```

### 3. Если проблема сохраняется:

Пересоберите frontend:
```bash
cd ~/proj
docker-compose build frontend
docker-compose up -d frontend
```

### 4. Проверьте, что все запросы используют `/api`:

Все API запросы должны идти через `/api`:
- `/api/cards` - список карточек
- `/api/cards/statistics` - статистика
- `/api/cards/review` - карточки для повторения
- `/api/cards/recent` - недавние карточки

## Примечание о логотипе

Логотип находится в `frontend/public/logo.png` и должен быть доступен напрямую по адресу `/logo.png`. Если он не загружается, проверьте:
1. Файл существует в `frontend/public/logo.png`
2. Next.js правильно обслуживает статические файлы из папки `public`

