# Изменение домена на cards.sybota.space

## Шаг 1: Настройка DNS

Добавьте A-запись для поддомена:
- **Имя:** `cards`
- **Тип:** `A`
- **Значение:** `46.191.230.86` (ваш IP)
- **TTL:** `3600` (или по умолчанию)

Подождите 5-15 минут для распространения DNS.

## Шаг 2: Получение SSL сертификата

После настройки DNS выполните:
```bash
sudo certbot --nginx -d cards.sybota.space
```

Или если certbot-nginx не установлен:
```bash
sudo systemctl stop nginx
sudo certbot certonly --standalone -d cards.sybota.space
sudo systemctl start nginx
```

## Шаг 3: Обновление конфигурации

После получения сертификата выполните скрипт:
```bash
~/proj/UPDATE_TO_CARDS_DOMAIN.sh
```

Или вручную обновите:
- `docker-compose.yml` - FRONTEND_URL и NEXT_PUBLIC_API_URL
- `backend/src/main.ts` - CORS настройки
- Конфигурацию Telegram бота (если используется)

## Время выполнения

- DNS настройка: 5-15 минут
- SSL сертификат: 2-5 минут
- Обновление конфигурации: 2-3 минуты
- Перезапуск сервисов: 1 минута

**Итого: ~10-25 минут**


