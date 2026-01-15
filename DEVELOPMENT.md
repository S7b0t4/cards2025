# 🛠 Руководство по разработке

## Быстрый перезапуск frontend

После внесения изменений в код frontend, выполните:

```bash
./restart-frontend.sh
```

Или вручную:

```bash
docker-compose build frontend && docker-compose up -d frontend
```

## Скрипты для разработки

### Перезапуск frontend
```bash
./restart-frontend.sh
```

### Перезапуск backend
```bash
docker-compose restart backend
```

### Перезапуск всех сервисов
```bash
docker-compose restart
```

### Просмотр логов
```bash
# Логи frontend
docker-compose logs -f frontend

# Логи backend
docker-compose logs -f backend

# Логи всех сервисов
docker-compose logs -f
```

## Рабочий процесс

1. Внесите изменения в код
2. Запустите `./restart-frontend.sh` для frontend изменений
3. Или `docker-compose restart backend` для backend изменений (если не требуется пересборка)
4. Проверьте изменения на сайте

## Структура проекта

- `frontend/` - Next.js приложение
- `backend/` - NestJS API
- `nginx/` - Конфигурация Nginx
- `docker-compose.yml` - Конфигурация Docker Compose






























