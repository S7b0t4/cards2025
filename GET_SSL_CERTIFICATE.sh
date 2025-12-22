#!/bin/bash
# Скрипт для получения SSL сертификата через certbot

echo "Получение SSL сертификата для sybota.space..."
echo ""

# Получаем сертификат через nginx
sudo certbot --nginx -d sybota.space -d www.sybota.space

echo ""
echo "Сертификат получен!"
echo ""
echo "Теперь нужно обновить конфигурацию docker-compose.yml для HTTPS:"
echo "1. FRONTEND_URL=https://sybota.space"
echo "2. NEXT_PUBLIC_API_URL=https://sybota.space"
echo ""
echo "Затем перезапустите контейнеры:"
echo "docker-compose restart frontend backend"

