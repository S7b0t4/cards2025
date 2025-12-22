# Исправление проблемы с /auth 404

## Проблема
Конфигурация nginx еще не обновлена - `/auth` проксируется на backend вместо frontend.

## Решение:

### 1. Обновите конфигурацию nginx

Выполните команды:

```bash
# Скопируйте обновленную конфигурацию
sudo cp ~/proj/nginx/sybota.space.http.conf /etc/nginx/sites-available/sybota.space

# Проверьте синтаксис
sudo nginx -t

# Перезагрузите nginx
sudo systemctl reload nginx
```

### 2. Или отредактируйте вручную

```bash
sudo nano /etc/nginx/sites-available/sybota.space
```

Найдите строку:
```nginx
location ~ ^/(api|auth|cards|users) {
```

Измените на:
```nginx
location ~ ^/(api|auth/telegram|auth/dev|cards|users) {
```

Сохраните (Ctrl+O, Enter, Ctrl+X) и перезагрузите:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Проверьте работу

После перезагрузки откройте: **http://sybota.space/auth**

Должна открыться страница авторизации, а не 404 ошибка.

## Объяснение:

- **Старая конфигурация:** `/auth` → Backend (404, т.к. нет GET /auth)
- **Новая конфигурация:** 
  - `/auth` → Frontend (страница авторизации) ✅
  - `/auth/telegram` → Backend (API POST) ✅
  - `/auth/dev` → Backend (API POST) ✅

