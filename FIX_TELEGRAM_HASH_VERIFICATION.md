# Исправление проверки хеша Telegram авторизации

## Проблема
Ошибка "Invalid Telegram authentication data" - проверка хеша не проходит.

## Причина
При формировании `dataCheckString` для проверки хеша включались поля со значением `undefined` или `null`, что неправильно. Telegram не отправляет такие поля, и они не должны участвовать в формировании строки для проверки хеша.

## Решение

### Изменен метод `verifyTelegramAuth`

Добавлена фильтрация `undefined` и `null` значений при формировании `dataCheckString`:

```typescript
const dataCheckString = Object.keys(authData)
  .filter(key => {
    // Exclude hash and undefined/null values
    return key !== 'hash' && authData[key] !== undefined && authData[key] !== null;
  })
  .sort()
  .map(key => `${key}=${authData[key]}`)
  .join('\n');
```

## Как это работает

1. Фильтруются все ключи, исключая:
   - `hash` (не участвует в проверке)
   - Поля со значением `undefined`
   - Поля со значением `null`

2. Оставшиеся ключи сортируются по алфавиту

3. Формируется строка в формате `key=value`, разделенная символом новой строки

4. Вычисляется хеш и сравнивается с полученным хешем

## После исправления

Теперь проверка хеша должна проходить корректно, даже если некоторые поля (например, `last_name`) отсутствуют в данных от Telegram.

