# Исправление ошибки "last_name must be a string"

## Проблема
При авторизации через Telegram возникала ошибка: "last_name must be a string". Это происходило потому, что:
1. В DTO опциональные поля имели валидатор `@IsString()` без `@IsOptional()`
2. Telegram может не отправлять некоторые поля (например, `last_name`), и они приходят как `null` или `undefined`

## Решение

### 1. Backend (DTO)
Добавлен `@IsOptional()` для всех опциональных полей:
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

## Проверка

После перезапуска backend и frontend попробуйте авторизоваться через Telegram. Ошибка должна исчезнуть.

## Примечание

Telegram может не отправлять некоторые поля, если пользователь их не указал в своем профиле. Это нормально, и теперь приложение корректно обрабатывает такие случаи.

