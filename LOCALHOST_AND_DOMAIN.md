# Поддержка localhost и домена одновременно

## Текущая конфигурация

Приложение уже настроено для работы и на localhost, и на домене:

### 1. Прямой доступ к сервисам (localhost)

**Frontend:**
- `http://localhost:3003` - прямой доступ к Next.js
- `http://127.0.0.1:3003` - альтернативный адрес

**Backend:**
- `http://localhost:3002` - прямой доступ к API
- `http://127.0.0.1:3002` - альтернативный адрес
- `http://localhost:3002/api` - Swagger документация

### 2. Доступ через домен

**Через Nginx:**
- `http://sybota.space` - frontend
- `http://sybota.space/api` - Swagger документация
- `http://sybota.space/api/cards` - API эндпоинты

### 3. Автоматическое определение API URL

Frontend автоматически определяет, какой API URL использовать:
- **localhost** → `http://localhost:3002`
- **sybota.space** → `http://sybota.space` (проксируется через nginx)
- **46.191.230.86** → `http://46.191.230.86:3002`

## Проверка работы

### Локально:

1. Откройте `http://localhost:3003` в браузере
2. Приложение должно работать, API запросы идут на `http://localhost:3002`

### На домене:

1. Откройте `http://sybota.space` в браузере
2. Приложение должно работать, API запросы идут через nginx

## Если что-то не работает

### Проблема: CORS ошибки на localhost

Проверьте, что backend разрешает запросы с localhost:
```bash
docker-compose logs backend | grep CORS
```

### Проблема: API запросы не работают

Проверьте логи frontend:
```bash
docker-compose logs frontend | grep AXIOS
```

В консоли браузера должны быть логи:
- `[AXIOS CONFIG] Client-side API URL (localhost): http://localhost:3002`
- `[AXIOS REQUEST CLIENT] {url: '/api/cards', ...}`

## Примечание

Оба варианта работают одновременно:
- Nginx обрабатывает только запросы к домену `sybota.space`
- Прямой доступ к портам 3002 и 3003 работает независимо от nginx

