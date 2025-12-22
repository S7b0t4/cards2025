#!/bin/bash
# Скрипт для настройки nginx для cards.sybota.space

echo "=== Настройка nginx для cards.sybota.space ==="
echo ""

# Копируем конфигурацию
echo "1. Копирование конфигурации..."
sudo cp ~/proj/nginx/cards.sybota.space.https.conf /etc/nginx/sites-available/cards.sybota.space

# Создаем симлинк
echo "2. Создание симлинка..."
sudo ln -sf /etc/nginx/sites-available/cards.sybota.space /etc/nginx/sites-enabled/cards.sybota.space

# Проверяем конфигурацию
echo "3. Проверка конфигурации nginx..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Конфигурация корректна"
    echo ""
    echo "4. Перезагрузка nginx..."
    sudo systemctl reload nginx
    echo ""
    echo "✅ Nginx перезагружен"
    echo ""
    echo "=== Готово! ==="
    echo ""
    echo "Теперь можно:"
    echo "1. Пересобрать backend: docker-compose build backend"
    echo "2. Перезапустить контейнеры: docker-compose restart frontend backend"
    echo "3. Проверить: https://cards.sybota.space"
else
    echo ""
    echo "❌ Ошибка в конфигурации nginx!"
    exit 1
fi

