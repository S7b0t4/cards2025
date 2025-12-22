# Исправление проблемы с маршрутизацией /api/cards

## Проблема
Запрос `/api/cards` возвращает HTML вместо JSON. Это означает, что запрос идет на frontend, а не на backend.

## Возможные причины:

1. **Браузер кеширует старую версию JavaScript** - запрос идет на `/cards` вместо `/api/cards`
2. **Контейнер не пересобрался** - изменения в коде не применились
3. **Nginx неправильно проксирует** - хотя curl показывает, что nginx работает правильно

## Решение:

### 1. Очистите кеш браузера:
- Нажмите `Ctrl+Shift+R` (жесткая перезагрузка)
- Или откройте в режиме инкогнито

### 2. Проверьте, что запрос идет на правильный URL:
В консоли браузера (F12) должно быть:
```
[AXIOS REQUEST CLIENT] {url: '/api/cards', ...}
```

А не:
```
[AXIOS REQUEST CLIENT] {url: '/cards', ...}
```

### 3. Пересоберите frontend (если нужно):

```bash
cd ~/proj
docker-compose build frontend
docker-compose up -d frontend
```

### 4. Проверьте логи frontend:

```bash
docker-compose logs frontend --tail 100 | grep -E "AXIOS|CONFIG"
```

Должны быть логи:
- `[AXIOS CONFIG] Client-side API URL (domain): http://sybota.space`
- `[AXIOS REQUEST CLIENT] {url: '/api/cards', ...}`

### 5. Если проблема сохраняется:

Проверьте, что конфигурация nginx применена:
```bash
sudo cp ~/proj/nginx/sybota.space.http.conf /etc/nginx/sites-available/sybota.space
sudo nginx -t
sudo systemctl reload nginx
```

