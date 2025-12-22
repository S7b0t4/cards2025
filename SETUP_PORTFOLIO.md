# Настройка портфолио на sybota.space

## ✅ Что сделано:

1. **Создано Next.js приложение** в папке `portfolio/`
2. **Создан красивый дизайн** с градиентами и современным UI
3. **Добавлен Dockerfile** для сборки портфолио
4. **Добавлен сервис в docker-compose.yml** (порт 3004)
5. **Создана конфигурация nginx** для sybota.space

## Шаги для запуска:

### 1. Собрать и запустить портфолио:

```bash
cd ~/proj
docker-compose build portfolio
docker-compose up -d portfolio
```

### 2. Установить конфигурацию nginx:

```bash
sudo cp ~/proj/nginx/sybota.space.portfolio.conf /etc/nginx/sites-available/sybota.space
sudo ln -sf /etc/nginx/sites-available/sybota.space /etc/nginx/sites-enabled/sybota.space
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Проверить:

Откройте https://sybota.space - должно открыться портфолио!

## Структура портфолио:

- **Hero Section** - главный экран с именем и описанием
- **Skills Section** - список технологий
- **Projects Section** - проекты с описанием
- **Contact Section** - ссылки на GitHub и Telegram

## Настройка:

Все настройки находятся в `portfolio/app/page.tsx`. Можно изменить:
- Имя и описание
- Список технологий
- Проекты
- Ссылки на соцсети

