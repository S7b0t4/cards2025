# Исправление ошибки "Bot domain invalid"

## ✅ Что сделано:

1. **Добавлена переменная окружения** `NEXT_PUBLIC_TELEGRAM_BOT_NAME` в `docker-compose.yml`
2. **Временно отключена проверка хеша** (`SKIP_TELEGRAM_HASH_CHECK=true`) для отладки
3. **Frontend пересобран** с новой переменной окружения

## ⚠️ Проблема "Bot domain invalid":

Эта ошибка означает, что Telegram виджет не может загрузиться, потому что:
- Telegram еще не применил изменения домена (может потребоваться 10-15 минут)
- Или домен указан неправильно в BotFather

## Что проверить:

1. **В BotFather:**
   ```
   /setdomain
   @S7b0t4bot
   cards.sybota.space
   ```

2. **Подождите 10-15 минут** после настройки домена

3. **Очистите кеш браузера** (Ctrl+Shift+Del) или используйте режим инкогнито

4. **Проверьте доступность:**
   ```bash
   curl -I https://cards.sybota.space
   ```

## Альтернатива:

Пока домен не настроен, используйте **кнопку "Войти как тестовый аккаунт"** на странице авторизации.

## После того, как домен заработает:

Включите проверку хеша обратно:
```bash
cd ~/proj
sed -i 's/SKIP_TELEGRAM_HASH_CHECK=true/SKIP_TELEGRAM_HASH_CHECK=false/' backend/.env
docker-compose restart backend
```

