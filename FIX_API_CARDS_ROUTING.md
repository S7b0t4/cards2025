# Исправление проблемы с маршрутизацией /api/cards

## Проблема
Запрос `/api/cards` возвращает HTML страницу вместо JSON данных. Это означает, что nginx проксирует запрос на frontend вместо backend.

## Решение

### 1. Убедитесь, что конфигурация применена:

```bash
sudo cp ~/proj/nginx/sybota.space.http.conf /etc/nginx/sites-available/sybota.space
sudo nginx -t
sudo systemctl reload nginx
```

### 2. Проверьте, что запрос идет на backend:

```bash
curl -H "Host: sybota.space" -H "Authorization: Bearer test" http://localhost/api/cards
```

Должен вернуться JSON с ошибкой 401, а не HTML.

### 3. Если проблема сохраняется, проверьте логи nginx:

```bash
sudo tail -20 /var/log/nginx/sybota.space.access.log
sudo tail -20 /var/log/nginx/sybota.space.error.log
```

### 4. Очистите кеш браузера

В браузере нажмите Ctrl+Shift+R (или Cmd+Shift+R на Mac) для жесткой перезагрузки страницы.

## Объяснение:

Конфигурация nginx должна:
- `/api/cards*` → Backend (http://127.0.0.1:3002/cards*)
- `/api` → Backend (http://127.0.0.1:3002)
- `/cards` → Frontend (http://127.0.0.1:3003)
- Все остальное → Frontend

Порядок location блоков важен - более специфичные должны быть первыми.

