# Настройка Nginx для домена sybota.space

## Шаг 1: Установка Nginx

Если nginx еще не установлен:

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
# или для новых версий
sudo dnf install nginx
```

## Шаг 2: Копирование конфигурации

**Выберите версию конфигурации:**

### Вариант A: Без SSL (для начала, потом настроите SSL)

```bash
sudo cp nginx/sybota.space.http.conf /etc/nginx/sites-available/sybota.space
```

### Вариант B: С SSL (если уже настроили Let's Encrypt)

```bash
sudo cp nginx/sybota.space.conf /etc/nginx/sites-available/sybota.space
# Затем отредактируйте и раскомментируйте строки с SSL сертификатами
```

2. Создайте симлинк для активации:

```bash
sudo ln -s /etc/nginx/sites-available/sybota.space /etc/nginx/sites-enabled/
```

3. Удалите дефолтную конфигурацию (если нужно):

```bash
sudo rm /etc/nginx/sites-enabled/default
```

## Шаг 3: Проверка конфигурации

Проверьте синтаксис конфигурации:

```bash
sudo nginx -t
```

Если все ок, вы увидите:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

## Шаг 4: Запуск/перезапуск Nginx

```bash
# Запуск nginx
sudo systemctl start nginx

# Автозапуск при загрузке системы
sudo systemctl enable nginx

# Перезапуск после изменения конфигурации
sudo systemctl reload nginx
# или
sudo systemctl restart nginx
```

## Шаг 5: Настройка файрвола

Откройте порты 80 (HTTP) и 443 (HTTPS):

```bash
# UFW
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload

# firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## Шаг 6: Обновление конфигурации приложения

Обновите переменные окружения в `docker-compose.yml` или через .env файл:

```bash
# В docker-compose.yml уже обновлено, но можно переопределить:
FRONTEND_URL=https://sybota.space NEXT_PUBLIC_API_URL=https://sybota.space docker-compose up -d --build
```

Или создайте `.env` файл в корне проекта:

```env
FRONTEND_URL=https://sybota.space
NEXT_PUBLIC_API_URL=https://sybota.space
```

## Шаг 7: Перезапуск приложения

```bash
cd /path/to/your/project
docker-compose down
docker-compose up -d --build
```

## Шаг 8: Настройка SSL (HTTPS) - Рекомендуется

### Вариант A: Let's Encrypt (бесплатный SSL)

1. **Установите certbot:**

```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx
```

2. **Получите сертификат:**

```bash
sudo certbot --nginx -d sybota.space -d www.sybota.space
```

3. **Следуйте инструкциям certbot** - он автоматически обновит конфигурацию nginx

4. **Автоматическое обновление сертификата:**

Certbot автоматически настроит cron для обновления сертификата. Проверьте:

```bash
sudo certbot renew --dry-run
```

### Вариант B: Временная работа без SSL

Если пока не хотите настраивать SSL, можно временно использовать HTTP:

1. Отредактируйте `/etc/nginx/sites-available/sybota.space`
2. Закомментируйте блок HTTPS (server с listen 443)
3. Раскомментируйте и настройте блок HTTP (server с listen 80) без редиректа
4. Перезапустите nginx: `sudo systemctl reload nginx`

⚠️ **Важно:** Без SSL данные передаются в открытом виде. Настройте SSL как можно скорее!

## Шаг 9: Настройка Telegram бота для домена

Теперь, когда у вас есть домен, настройте его в BotFather:

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте команду `/setdomain`
3. Выберите вашего бота
4. Введите домен: `sybota.space` (без http:// или https://)

## Проверка работы

1. **Проверьте доступность сайта:**
   ```bash
   curl -I https://sybota.space
   # или
   curl -I http://sybota.space
   ```

2. **Откройте в браузере:**
   - https://sybota.space (или http:// если SSL не настроен)

3. **Проверьте API:**
   ```bash
   curl https://sybota.space/api
   ```

4. **Проверьте логи nginx:**
   ```bash
   sudo tail -f /var/log/nginx/sybota.space.access.log
   sudo tail -f /var/log/nginx/sybota.space.error.log
   ```

## Структура проксирования

После настройки nginx:

- `https://sybota.space/` → Frontend (Next.js на порту 3003)
- `https://sybota.space/api` → Backend API (NestJS на порту 3002)
- `https://sybota.space/auth` → Backend API (NestJS на порту 3002)
- `https://sybota.space/cards` → Backend API (NestJS на порту 3002)
- `https://sybota.space/users` → Backend API (NestJS на порту 3002)

## Решение проблем

### Nginx не запускается

```bash
# Проверьте синтаксис
sudo nginx -t

# Проверьте логи
sudo journalctl -u nginx -n 50
```

### 502 Bad Gateway

- Убедитесь, что приложение запущено: `docker-compose ps`
- Проверьте, что порты 3002 и 3003 доступны: `netstat -tulpn | grep -E '3002|3003'`
- Проверьте логи nginx: `sudo tail -f /var/log/nginx/sybota.space.error.log`

### CORS ошибки

- Убедитесь, что в `backend/src/main.ts` добавлен домен в `allowedOrigins`
- Перезапустите backend: `docker-compose restart backend`

### Страница не загружается

- Проверьте, что DNS правильно настроен: `dig sybota.space`
- Проверьте файрвол: `sudo ufw status`
- Проверьте, что nginx слушает правильные порты: `sudo netstat -tulpn | grep nginx`

## Дополнительные настройки

### Оптимизация производительности

Добавьте в конфигурацию nginx (в блок `server`):

```nginx
# Кэширование статических файлов
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
    proxy_pass http://127.0.0.1:3003;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Rate limiting (защита от DDoS)

Добавьте в начало конфигурации:

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

# В блоке location /api
limit_req zone=api_limit burst=20 nodelay;
```

## Полезные команды

```bash
# Перезагрузка конфигурации без остановки
sudo nginx -s reload

# Проверка статуса
sudo systemctl status nginx

# Просмотр активных соединений
sudo netstat -tulpn | grep nginx

# Тест конфигурации
sudo nginx -t
```

