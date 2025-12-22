#!/bin/bash
# Скрипт для обновления домена на cards.sybota.space

echo "Обновление домена на cards.sybota.space..."
echo ""

# Проверяем, что SSL сертификат получен
if [ ! -f "/etc/letsencrypt/live/cards.sybota.space/fullchain.pem" ]; then
    echo "❌ SSL сертификат для cards.sybota.space не найден!"
    echo "Сначала получите сертификат:"
    echo "sudo certbot --nginx -d cards.sybota.space"
    exit 1
fi

echo "✅ SSL сертификат найден"
echo ""

# Обновляем docker-compose.yml
echo "Обновление docker-compose.yml..."
cd ~/proj
sed -i 's|FRONTEND_URL:.*sybota.space|FRONTEND_URL: ${FRONTEND_URL:-https://cards.sybota.space}|g' docker-compose.yml
sed -i 's|NEXT_PUBLIC_API_URL:.*sybota.space|NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-https://cards.sybota.space}|g' docker-compose.yml

echo "✅ docker-compose.yml обновлен"
echo ""

# Обновляем CORS в backend
echo "Обновление CORS в backend..."
# Это нужно сделать вручную в backend/src/main.ts
echo "⚠️  Нужно вручную обновить backend/src/main.ts:"
echo "   - Заменить 'sybota.space' на 'cards.sybota.space' в allowedOrigins"
echo ""

# Перезапускаем контейнеры
echo "Перезапуск контейнеров..."
docker-compose restart frontend backend

echo ""
echo "✅ Домен обновлен на cards.sybota.space!"
echo ""
echo "Проверьте:"
echo "1. https://cards.sybota.space - должен открываться"
echo "2. Обновите домен в Telegram боте (если используется):"
echo "   /setdomain в @BotFather → cards.sybota.space"


