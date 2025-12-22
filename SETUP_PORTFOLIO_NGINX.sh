#!/bin/bash
# Скрипт для настройки nginx для портфолио на sybota.space

echo "=== Настройка nginx для портфолио на sybota.space ==="
echo ""

# Копируем конфигурацию
echo "1. Копирование конфигурации..."
sudo cp ~/proj/nginx/sybota.space.portfolio.conf /etc/nginx/sites-available/sybota.space

# Создаем симлинк
echo "2. Создание симлинка..."
sudo ln -sf /etc/nginx/sites-available/sybota.space /etc/nginx/sites-enabled/sybota.space

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
    echo "Портфолио доступно на: https://sybota.space"
else
    echo ""
    echo "❌ Ошибка в конфигурации nginx!"
    exit 1
fi

