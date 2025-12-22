# Исправление проблемы с /cards 401 Unauthorized

## Проблема
При открытии `http://sybota.space/cards` получаем ошибку `{"message":"Unauthorized","statusCode":401}`.

## Причина
Nginx проксировал `/cards` на backend, но GET запрос к `/cards` без заголовка Authorization должен идти на frontend (страница), а с заголовком Authorization - на backend (API).

## Решение:

### 1. Обновите конфигурацию nginx

```bash
# Скопируйте обновленную конфигурацию
sudo cp ~/proj/nginx/sybota.space.http.conf /etc/nginx/sites-available/sybota.space

# Проверьте синтаксис
sudo nginx -t

# Перезагрузите nginx
sudo systemctl reload nginx
```

### 2. Что изменилось:

- **GET /cards** (без Authorization) → Frontend (страница) ✅
- **GET /cards** (с Authorization) → Backend (API) ✅
- **POST/PATCH/DELETE /cards** → Backend (API) ✅
- **GET /cards/:id** (с Authorization) → Backend (API) ✅
- **GET /cards/:id** (без Authorization) → Frontend ✅

### 3. Проверьте работу

После перезагрузки:
1. Откройте **http://sybota.space/cards** - должна открыться страница
2. Страница автоматически загрузит карточки через API (с Authorization заголовком)

## Объяснение:

Nginx теперь проверяет:
- Наличие заголовка `Authorization` - если есть, запрос идет на backend
- Метод запроса - POST/PATCH/DELETE всегда идут на backend
- Остальные GET запросы без Authorization идут на frontend

