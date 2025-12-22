# Режим разработки с автоматической пересборкой

## Быстрый старт для разработки

Для разработки с автоматической пересборкой при изменениях используйте:

```bash
docker-compose -f docker-compose.dev.yml up --build
```

Это запустит:
- PostgreSQL на порту 5433
- Backend в dev режиме с hot reload на порту 3002
- Frontend в dev режиме с hot reload на порту 3003

## Как это работает

- **Backend**: Код монтируется через volume, NestJS автоматически перезагружается при изменениях
- **Frontend**: Код монтируется через volume, Next.js автоматически перезагружается при изменениях
- Изменения в файлах сразу видны в контейнерах без пересборки

## Production режим

Для production используйте обычный docker-compose:

```bash
docker-compose up --build
```

## Остановка

```bash
docker-compose -f docker-compose.dev.yml down
```

## Полезные команды

```bash
# Просмотр логов
docker-compose -f docker-compose.dev.yml logs -f

# Перезапуск конкретного сервиса
docker-compose -f docker-compose.dev.yml restart backend

# Пересборка без кеша
docker-compose -f docker-compose.dev.yml build --no-cache
```







