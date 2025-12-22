# Финальное исправление проблемы с /cards 401 Unauthorized

## Проблема
При открытии `http://sybota.space/cards` получаем ошибку `{"message":"Unauthorized","statusCode":401}`.

## Решение

### 1. Изменения в frontend
Все API запросы к `/cards` теперь идут через `/api/cards`:
- `GET /cards` → `GET /api/cards`
- `POST /cards` → `POST /api/cards`
- `PATCH /cards/:id` → `PATCH /api/cards/:id`
- `DELETE /cards/:id` → `DELETE /api/cards/:id`
- `GET /cards/review` → `GET /api/cards/review`
- `GET /cards/recent` → `GET /api/cards/recent`
- `GET /cards/statistics` → `GET /api/cards/statistics`

### 2. Изменения в nginx
Nginx теперь:
- Проксирует `/api/cards*` на backend, убирая префикс `/api`
- Проксирует `/cards` (без `/api`) на frontend (страница)

### 3. Обновите конфигурацию nginx

```bash
# Скопируйте обновленную конфигурацию
sudo cp ~/proj/nginx/sybota.space.http.conf /etc/nginx/sites-available/sybota.space

# Проверьте синтаксис
sudo nginx -t

# Перезагрузите nginx
sudo systemctl reload nginx
```

### 4. Перезапустите frontend

```bash
cd ~/proj
docker-compose restart frontend
```

### 5. Проверьте работу

1. Откройте **http://sybota.space/cards** - должна открыться страница
2. Страница автоматически загрузит карточки через API (`/api/cards`)

## Объяснение:

- **GET /cards** (браузер) → Frontend (страница) ✅
- **GET /api/cards** (axios с Authorization) → Backend (API) ✅
- **POST /api/cards** → Backend (API) ✅
- **PATCH/DELETE /api/cards/:id** → Backend (API) ✅

Теперь нет конфликта между страницей и API эндпоинтом!

