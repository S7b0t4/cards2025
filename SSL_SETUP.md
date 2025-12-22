# Настройка SSL сертификата для sybota.space

## Шаг 1: Установка certbot

На Arch Linux:
```bash
sudo pacman -S certbot certbot-nginx
```

## Шаг 2: Получение SSL сертификата

### Вариант A: Через nginx (рекомендуется)

```bash
sudo certbot --nginx -d sybota.space -d www.sybota.space
```

Certbot автоматически:
- Получит сертификат
- Настроит nginx
- Настроит автоматическое обновление

### Вариант B: Вручную (standalone)

Если nginx еще не настроен или есть проблемы:

```bash
# Остановите nginx временно
sudo systemctl stop nginx

# Получите сертификат
sudo certbot certonly --standalone -d sybota.space -d www.sybota.space

# Запустите nginx обратно
sudo systemctl start nginx
```

## Шаг 3: Настройка nginx для HTTPS

1. Скопируйте HTTPS конфигурацию:
```bash
sudo cp ~/proj/nginx/sybota.space.https.conf /etc/nginx/sites-available/sybota.space.https
sudo ln -sf /etc/nginx/sites-available/sybota.space.https /etc/nginx/sites-enabled/sybota.space.https
```

2. Или используйте конфигурацию, созданную certbot автоматически.

3. Проверьте конфигурацию:
```bash
sudo nginx -t
```

4. Перезагрузите nginx:
```bash
sudo systemctl reload nginx
```

## Шаг 4: Автоматическое обновление сертификата

Certbot автоматически настроит cron job для обновления сертификата.

Проверить можно командой:
```bash
sudo certbot renew --dry-run
```

## Шаг 5: Обновление frontend для HTTPS

После настройки SSL нужно обновить конфигурацию frontend, чтобы он использовал HTTPS:

1. Обновите `docker-compose.yml`:
```yaml
FRONTEND_URL: ${FRONTEND_URL:-https://sybota.space}
NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-https://sybota.space}
```

2. Обновите CORS в backend для HTTPS.

3. Перезапустите контейнеры:
```bash
docker-compose restart frontend backend
```

## Проверка

После настройки проверьте:
- `https://sybota.space` - должен открываться с зеленым замком
- `http://sybota.space` - должен редиректить на HTTPS

## Примечания

- Сертификат Let's Encrypt действителен 90 дней
- Certbot автоматически обновляет сертификат каждые 60 дней
- Для продакшена рекомендуется использовать полноценный SSL сертификат

