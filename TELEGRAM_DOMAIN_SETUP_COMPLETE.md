# Telegram домен настроен - проверка хеша включена

## Статус

✅ Домен `sybota.space` успешно настроен в BotFather для бота `@S7b0t4bot`

## Что изменилось

1. **Проверка хеша включена** - `SKIP_TELEGRAM_HASH_CHECK=false` в `backend/.env`
2. **Backend перезапущен** - проверка хеша теперь активна

## Как это работает

Теперь при авторизации через Telegram:

1. Telegram виджет отправляет данные с хешем
2. Backend проверяет хеш используя:
   - `dataCheckString` из всех полей (кроме hash)
   - `secretKey` = HMAC_SHA256("WebAppData", bot_token)
   - `calculatedHash` = HMAC_SHA256(secretKey, dataCheckString)
3. Если хеш совпадает → авторизация успешна
4. Если хеш не совпадает → ошибка "Invalid Telegram authentication data"

## Если проверка хеша не работает

Если после настройки домена проверка хеша все еще не работает:

1. Подождите несколько минут - изменения в BotFather могут применяться с задержкой
2. Проверьте, что домен указан правильно (без `http://` или `https://`)
3. Проверьте логи backend:
   ```bash
   docker-compose logs backend | grep "TELEGRAM AUTH DEBUG"
   ```
4. Временно можно отключить проверку, установив `SKIP_TELEGRAM_HASH_CHECK=true` в `backend/.env`

## Проверка

Попробуйте авторизоваться через Telegram. Если все настроено правильно, авторизация должна пройти успешно с проверкой хеша.

