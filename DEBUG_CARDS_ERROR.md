# Отладка ошибки "Application error" на /cards

## Проблема
При открытии `http://sybota.space/cards` появляется ошибка "Application error: a client-side exception has occurred".

## Что было исправлено:

1. **Frontend код:** Улучшена обработка ошибок в `useEffect`
2. **Frontend код:** Все API запросы изменены с `/cards` на `/api/cards`
3. **Nginx конфигурация:** Добавлено проксирование `/api/cards*` на backend

## Проверка:

### 1. Убедитесь, что nginx конфигурация применена:

```bash
sudo cp ~/proj/nginx/sybota.space.http.conf /etc/nginx/sites-available/sybota.space
sudo nginx -t
sudo systemctl reload nginx
```

### 2. Проверьте логи frontend:

```bash
cd ~/proj
docker-compose logs frontend --tail 50
```

### 3. Проверьте логи backend:

```bash
cd ~/proj
docker-compose logs backend --tail 50
```

### 4. Откройте консоль браузера (F12) и проверьте ошибки

В консоли браузера должны быть логи:
- `[AXIOS REQUEST]` - запросы к API
- `[AXIOS RESPONSE]` или `[AXIOS RESPONSE ERROR]` - ответы от API
- `[CARDS PAGE]` - логи страницы карточек

### 5. Проверьте, что токен есть в localStorage

В консоли браузера выполните:
```javascript
localStorage.getItem('token')
```

Если токена нет, нужно авторизоваться на `/auth`.

## Возможные причины ошибки:

1. **Нет токена** - пользователь не авторизован, должен быть редирект на `/auth`
2. **Ошибка в API запросе** - проверьте логи backend
3. **Ошибка в обработке searchParams** - уже исправлено
4. **Проблема с Suspense** - компонент обернут в Suspense, должно работать

## Следующие шаги:

1. Откройте `http://sybota.space/cards` в браузере
2. Откройте консоль разработчика (F12)
3. Посмотрите на ошибки в консоли
4. Проверьте вкладку Network - какие запросы делаются и какие ответы приходят

