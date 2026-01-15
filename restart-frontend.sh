#!/bin/bash

# Скрипт для пересборки и перезапуска frontend
# Использование: ./restart-frontend.sh

echo "🔄 Пересборка и перезапуск frontend..."

cd "$(dirname "$0")"

docker-compose build frontend && docker-compose up -d frontend

if [ $? -eq 0 ]; then
    echo "✅ Frontend успешно пересобран и перезапущен!"
    echo "📝 Проверьте изменения на сайте"
else
    echo "❌ Ошибка при пересборке frontend"
    exit 1
fi






























