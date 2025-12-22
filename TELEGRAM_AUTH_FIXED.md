# Исправление ошибки валидации при авторизации через Telegram

## Проблема
При авторизации через Telegram возникала ошибка `BadRequestException: Bad Request Exception` из-за того, что валидатор требовал строку для опциональных полей (`last_name`, `username`, `photo_url`), которые могут отсутствовать.

## Решение

### 1. Backend (DTO)
Добавлен `@IsOptional()` для всех опциональных полей в `TelegramOAuthDto`:
- `first_name`
- `last_name`
- `username`
- `photo_url`

### 2. Frontend
Изменена отправка данных - теперь вместо `null` отправляется `undefined`:
```typescript
first_name: user.first_name || undefined,
last_name: user.last_name || undefined,
username: user.username || undefined,
photo_url: user.photo_url || undefined,
```

### 3. Пересборка backend
Backend был пересобран и перезапущен, чтобы изменения применились.

## Проверка

После перезапуска backend попробуйте авторизоваться через Telegram. Ошибка должна исчезнуть.

## Примечание

Telegram может не отправлять некоторые поля, если пользователь их не указал в своем профиле. Это нормально, и теперь приложение корректно обрабатывает такие случаи.

