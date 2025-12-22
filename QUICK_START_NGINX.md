# Быстрый старт: Настройка nginx для sybota.space

## Шаги для запуска

### 1. Скопируйте конфигурацию nginx

```bash
sudo cp nginx/sybota.space.http.conf /etc/nginx/sites-available/sybota.space
sudo ln -s /etc/nginx/sites-available/sybota.space /etc/nginx/sites-enabled/
```

### 2. Проверьте и перезапустите nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Откройте порты (если еще не открыты)

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### 4. Обновите и перезапустите приложение

```bash
cd /path/to/your/project
docker-compose down
docker-compose up -d --build
```

### 5. Проверьте работу

Откройте в браузере: **http://sybota.space**

## Настройка Telegram бота

1. Откройте [@BotFather](https://t.me/BotFather)
2. Отправьте `/setdomain`
3. Выберите вашего бота
4. Введите: `sybota.space` (без http://)

## Настройка SSL (после проверки работы)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d sybota.space -d www.sybota.space
```

После этого обновите `docker-compose.yml`:
- `FRONTEND_URL=https://sybota.space`
- `NEXT_PUBLIC_API_URL=https://sybota.space`

И перезапустите: `docker-compose up -d --build`

## Полная инструкция

См. файл `NGINX_SETUP.md` для подробной инструкции.

