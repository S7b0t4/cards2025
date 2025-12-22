# Проверка серверных логов для отладки SSR

## Что было добавлено:

1. **Логирование для серверных запросов** - теперь все запросы с сервера будут логироваться с префиксом `[AXIOS REQUEST SERVER]` и `[AXIOS RESPONSE SERVER]`
2. **Логирование конфигурации API URL** - при инициализации axios будет логироваться, какой URL используется

## Как проверить:

### 1. Перезапустите frontend:

```bash
cd ~/proj
docker-compose restart frontend
```

### 2. Проверьте логи frontend:

```bash
docker-compose logs frontend --tail 50 -f
```

### 3. Откройте страницу в браузере:

Откройте `http://sybota.space/cards` и посмотрите логи.

### 4. Что искать в логах:

**На сервере (в Docker логах) должны быть:**
```
[AXIOS CONFIG] Server-side API URL: http://sybota.space
[AXIOS REQUEST SERVER] {
  "environment": "SERVER",
  "method": "GET",
  "url": "/api/cards",
  "baseURL": "http://sybota.space",
  "fullURL": "http://sybota.space/api/cards",
  ...
}
```

**В браузере (в консоли) должны быть:**
```
[AXIOS CONFIG] Client-side API URL (domain): http://sybota.space
[AXIOS REQUEST CLIENT] {
  environment: "CLIENT",
  method: "GET",
  url: "/api/cards",
  baseURL: "http://sybota.space",
  fullURL: "http://sybota.space/api/cards",
  ...
}
```

## Возможные проблемы:

1. **Если на сервере baseURL = `http://localhost:3002`** - значит переменная окружения `NEXT_PUBLIC_API_URL` не установлена правильно
2. **Если на сервере запрос идет на `/cards` вместо `/api/cards`** - значит код не обновился
3. **Если запрос идет на неправильный URL** - нужно проверить переменные окружения

## Решение проблем:

Если на сервере используется неправильный URL, проверьте:
```bash
docker-compose exec frontend env | grep NEXT_PUBLIC_API_URL
```

Должно быть: `NEXT_PUBLIC_API_URL=http://sybota.space`

Если нет, перезапустите контейнер:
```bash
docker-compose down frontend
docker-compose up -d frontend
```

