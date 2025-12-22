# Настройка Telegram Bot Token

## Проблема
Ошибка: "Telegram bot token not configured" - переменная окружения `TELEGRAM_BOT_TOKEN` не установлена.

## Решение

### 1. Получите токен бота от BotFather

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте команду `/mybots`
3. Выберите вашего бота
4. Нажмите "API Token"
5. Скопируйте токен (формат: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Установите переменную окружения

**Вариант A: Через .env файл (рекомендуется)**

Создайте файл `.env` в корне проекта:
```bash
cd ~/proj
nano .env
```

Добавьте строку:
```
TELEGRAM_BOT_TOKEN=ваш_токен_от_BotFather
```

**Вариант B: Через docker-compose.yml напрямую (не рекомендуется для production)**

Отредактируйте `docker-compose.yml`:
```yaml
TELEGRAM_BOT_TOKEN: ваш_токен_от_BotFather
```

### 3. Перезапустите backend

```bash
cd ~/proj
docker-compose restart backend
```

Или если используете .env файл:
```bash
docker-compose down backend
docker-compose up -d backend
```

### 4. Проверьте, что токен установлен

```bash
docker-compose exec backend env | grep TELEGRAM_BOT_TOKEN
```

Должно показать токен (без вывода значения для безопасности).

## Важно

⚠️ **Не коммитьте токен в Git!** Добавьте `.env` в `.gitignore`:
```bash
echo ".env" >> .gitignore
```

## После настройки

После установки токена авторизация через Telegram должна работать. Убедитесь также, что:
1. Домен настроен в BotFather (`/setdomain`)
2. Домен указан правильно (без `http://` или `https://`)

