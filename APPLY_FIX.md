# Применение исправления для /cards

## Выполните команды:

### 1. Обновите конфигурацию nginx

```bash
sudo cp ~/proj/nginx/sybota.space.http.conf /etc/nginx/sites-available/sybota.space
sudo nginx -t
sudo systemctl reload nginx
```

### 2. Перезапустите frontend (чтобы применить изменения в коде)

```bash
cd ~/proj
docker-compose restart frontend
```

### 3. Проверьте работу

Откройте **http://sybota.space/cards** - должна открыться страница с карточками.

## Что изменилось:

1. **Frontend:** Все API запросы к `/cards` теперь идут через `/api/cards`
2. **Nginx:** Проксирует `/api/cards*` на backend, убирая префикс `/api`
3. **Nginx:** Проксирует `/cards` (без `/api`) на frontend (страница)

Теперь нет конфликта между страницей и API эндпоинтом!

