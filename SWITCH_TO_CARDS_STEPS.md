# Переключение на cards.sybota.space

## Шаг 1: Получить SSL сертификат

```bash
sudo certbot --nginx -d cards.sybota.space
```

Или если certbot-nginx не установлен:
```bash
sudo systemctl stop nginx
sudo certbot certonly --standalone -d cards.sybota.space
sudo systemctl start nginx
```

## Шаг 2: Применить изменения

После получения сертификата выполните:
```bash
~/proj/SWITCH_TO_CARDS_DOMAIN.sh
```

Или вручную:

1. **Обновить docker-compose.yml** (уже сделано):
   - FRONTEND_URL: https://cards.sybota.space
   - NEXT_PUBLIC_API_URL: https://cards.sybota.space

2. **Обновить CORS в backend** (уже сделано):
   - Добавлен cards.sybota.space в allowedOrigins

3. **Обновить axios-config** (уже сделано):
   - Добавлен cards.sybota.space в определение домена

4. **Пересобрать и перезапустить**:
   ```bash
   cd ~/proj
   docker-compose build backend
   docker-compose restart frontend backend
   ```

## Шаг 3: Обновить Telegram бота

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


