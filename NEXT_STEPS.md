# Следующие шаги после настройки nginx

## 1. Проверьте, что nginx видит вашу конфигурацию

```bash
sudo nginx -t
```

Должно быть: `syntax is ok` и `test is successful`

## 2. Перезапустите nginx

```bash
sudo systemctl reload nginx
# или
sudo systemctl restart nginx
```

## 3. Проверьте, что приложение работает

```bash
# Проверьте статус контейнеров
docker-compose ps

# Проверьте, что frontend отвечает
curl http://localhost:3003

# Проверьте, что backend отвечает
curl http://localhost:3002
```

## 4. Проверьте работу через домен

```bash
# С вашего сервера
curl -H "Host: sybota.space" http://localhost

# Или откройте в браузере
# http://sybota.space
```

## 5. Настройте Telegram бота для домена

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте команду `/setdomain`
3. Выберите вашего бота из списка
4. Введите домен: `sybota.space` (без http:// или https://)
5. Подтвердите

## 6. Обновите переменные окружения (если нужно)

Если вы используете домен вместо IP, обновите `docker-compose.yml`:

```bash
cd ~/proj
docker-compose down
FRONTEND_URL=http://sybota.space NEXT_PUBLIC_API_URL=http://sybota.space docker-compose up -d --build
```

Или создайте `.env` файл в корне проекта:

```env
FRONTEND_URL=http://sybota.space
NEXT_PUBLIC_API_URL=http://sybota.space
```

## 7. Проверьте работу сайта

Откройте в браузере: **http://sybota.space**

Должна открыться страница авторизации с кнопкой "Login with Telegram".

## 8. Настройте SSL (HTTPS) - рекомендуется

После проверки работы на HTTP, настройте HTTPS:

```bash
# Установите certbot
sudo pacman -S certbot certbot-nginx

# Получите сертификат
sudo certbot --nginx -d sybota.space -d www.sybota.space
```

После получения сертификата обновите переменные окружения на `https://sybota.space` и перезапустите приложение.

## Решение проблем

### Сайт не открывается

1. Проверьте DNS:
   ```bash
   dig sybota.space
   ```
   Должен указывать на ваш IP: 46.191.230.86

2. Проверьте файрвол:
   ```bash
   sudo ufw status
   ```
   Порты 80 и 443 должны быть открыты

3. Проверьте логи nginx:
   ```bash
   sudo tail -f /var/log/nginx/sybota.space.error.log
   ```

### 502 Bad Gateway

- Убедитесь, что приложение запущено: `docker-compose ps`
- Проверьте, что порты 3002 и 3003 доступны: `netstat -tulpn | grep -E '3002|3003'`

### CORS ошибки

- Убедитесь, что в `backend/src/main.ts` добавлен домен в `allowedOrigins`
- Перезапустите backend: `docker-compose restart backend`

