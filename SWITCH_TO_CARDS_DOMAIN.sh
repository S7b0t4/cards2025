#!/bin/bash
# Скрипт для переключения на cards.sybota.space

echo "=== Переключение на cards.sybota.space ==="
echo ""

# Проверяем, что SSL сертификат получен
if [ ! -f "/etc/letsencrypt/live/cards.sybota.space/fullchain.pem" ]; then
    echo "❌ SSL сертификат для cards.sybota.space не найден!"
    echo ""
    echo "Сначала получите сертификат:"
    echo "sudo certbot --nginx -d cards.sybota.space"
    echo ""
    echo "Или через standalone:"
    echo "sudo systemctl stop nginx"
    echo "sudo certbot certonly --standalone -d cards.sybota.space"
    echo "sudo systemctl start nginx"
    exit 1
fi

echo "✅ SSL сертификат найден"
echo ""

# Обновляем docker-compose.yml
echo "1. Обновление docker-compose.yml..."
cd ~/proj
sed -i 's|FRONTEND_URL:.*sybota.space|FRONTEND_URL: ${FRONTEND_URL:-https://cards.sybota.space}|g' docker-compose.yml
sed -i 's|NEXT_PUBLIC_API_URL:.*sybota.space|NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-https://cards.sybota.space}|g' docker-compose.yml
echo "✅ docker-compose.yml обновлен"
echo ""

# Обновляем CORS в backend
echo "2. Обновление CORS в backend..."
cd ~/proj/backend/src
# Заменяем sybota.space на cards.sybota.space в allowedOrigins
sed -i "s|'https://sybota.space'|'https://cards.sybota.space',\n    'https://sybota.space'|g" main.ts
sed -i "s|'http://sybota.space'|'http://cards.sybota.space',\n    'http://sybota.space'|g" main.ts
sed -i "s|sybota\.space|cards\.sybota\.space|g" main.ts
# Но оставляем старый домен тоже для совместимости
sed -i "s|cards\.sybota\.space|sybota\.space|g" main.ts
sed -i "s|sybota\.space|cards\.sybota\.space|g" main.ts
echo "✅ CORS обновлен (нужна пересборка backend)"
echo ""

# Перезапускаем контейнеры
echo "3. Перезапуск контейнеров..."
cd ~/proj
docker-compose restart frontend backend
echo "✅ Контейнеры перезапущены"
echo ""

echo "=== Готово! ==="
echo ""
echo "Проверьте:"
echo "1. https://cards.sybota.space - должен открываться"
echo "2. Обновите домен в Telegram боте:"
echo "   /setdomain в @BotFather → cards.sybota.space"
echo ""
echo "⚠️  Backend нужно пересобрать для применения изменений CORS:"
echo "   docker-compose build backend"
echo "   docker-compose up -d backend"


