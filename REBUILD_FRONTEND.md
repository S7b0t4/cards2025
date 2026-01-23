# Пересборка Frontend контейнера

## Проблема

Когда код frontend обновляется, но Docker контейнер не пересобирается, возникает ситуация, когда:
- Код в репозитории обновлён
- Docker образ содержит старый билд
- Контейнер запущен со старым образом
- Next.js выдаёт ошибки типа: `Failed to find Server Action "x". This request might be from an older or newer deployment.`

## Решение: Пересборка и перезапуск

### Вариант 1: Через Docker Compose (рекомендуется)

```bash
cd /home/sybota/cards2025

# Остановить frontend контейнер
docker compose down frontend

# Пересобрать образ без кэша
docker compose build --no-cache frontend

# Запустить контейнер
docker compose up -d frontend
```

### Вариант 2: Вручную через Docker

```bash
cd /home/sybota/cards2025

# Остановить и удалить старый контейнер
docker stop frontend_app
docker rm frontend_app

# Пересобрать образ без кэша
docker compose build --no-cache frontend

# Запустить новый контейнер
docker run -d \
  --name frontend_app \
  --network cards2025_app-network \
  -p 3003:3003 \
  -e NEXT_PUBLIC_API_URL=https://cards.sybota.space \
  -e NEXT_PUBLIC_TELEGRAM_BOT_NAME=S7b0t4bot \
  -e PORT=3003 \
  --restart unless-stopped \
  cards2025-frontend
```

### Вариант 3: Быстрая пересборка (с кэшем)

Если нужно быстро обновить без полной пересборки:

```bash
cd /home/sybota/cards2025

# Остановить контейнер
docker stop frontend_app

# Пересобрать (с кэшем)
docker compose build frontend

# Удалить старый контейнер
docker rm frontend_app

# Запустить новый
docker compose up -d frontend
```

## Проверка

После пересборки проверьте:

1. **Статус контейнера:**
   ```bash
   docker ps | grep frontend
   ```

2. **Логи контейнера:**
   ```bash
   docker logs frontend_app --tail 30
   ```

3. **Доступность приложения:**
   ```bash
   curl -I http://localhost:3003
   ```

4. **Время создания образа:**
   ```bash
   docker images cards2025-frontend
   ```

## Когда нужно пересобирать

Пересборка необходима когда:
- ✅ Обновлён код в `frontend/` директории
- ✅ Изменены зависимости в `package.json`
- ✅ Обновлён `next.config.js`
- ✅ Изменены переменные окружения
- ✅ Появились ошибки Next.js о несоответствии версий

## Примечания

- `--no-cache` гарантирует полную пересборку, но занимает больше времени
- Без `--no-cache` Docker использует кэш, что быстрее, но может пропустить некоторые изменения
- После пересборки может потребоваться очистить кэш браузера (Ctrl+Shift+R)
- Если используется nginx, может потребоваться его перезагрузка: `sudo systemctl reload nginx`

## Автоматизация

Для автоматической пересборки при изменениях можно использовать скрипт:

```bash
#!/bin/bash
# rebuild-frontend.sh

cd /home/sybota/cards2025
docker compose build --no-cache frontend
docker stop frontend_app
docker rm frontend_app
docker compose up -d frontend
echo "Frontend пересобран и перезапущен"
```
