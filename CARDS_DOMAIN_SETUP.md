# Настройка cards.sybota.space

## ✅ Шаг 1: SSL сертификат получен

Сертификат уже получен, но нужно установить конфигурацию nginx.

## Шаг 2: Установить конфигурацию nginx

Выполните команды:

```bash
sudo cp ~/proj/nginx/cards.sybota.space.https.conf /etc/nginx/sites-available/cards.sybota.space
sudo ln -sf /etc/nginx/sites-available/cards.sybota.space /etc/nginx/sites-enabled/cards.sybota.space
sudo nginx -t
sudo systemctl reload nginx
```

Или используйте скрипт:
```bash
~/proj/SETUP_CARDS_NGINX.sh
```

## Шаг 3: Пересобрать и перезапустить контейнеры

```bash
cd ~/proj
docker-compose build backend
docker-compose restart frontend backend
```

## Шаг 4: Обновить Telegram бота

В @BotFather:
```
/setdomain
@S7b0t4bot
cards.sybota.space
```

## Проверка

После выполнения всех шагов:
- https://cards.sybota.space - должен открываться
- Авторизация через Telegram должна работать
- API запросы должны идти на cards.sybota.space

## Что уже сделано:

✅ Обновлен `docker-compose.yml`:
- FRONTEND_URL: https://cards.sybota.space
- NEXT_PUBLIC_API_URL: https://cards.sybota.space

✅ Обновлен CORS в `backend/src/main.ts`:
- Добавлен cards.sybota.space в allowedOrigins

✅ Обновлен `frontend/app/lib/axios-config.ts`:
- Добавлен cards.sybota.space в определение домена

✅ Создана конфигурация nginx:
- `nginx/cards.sybota.space.https.conf`

