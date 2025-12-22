#!/bin/bash
# Получение SSL сертификата только для sybota.space (без www)

echo "Получение SSL сертификата для sybota.space (без www)..."
echo ""

# Получаем сертификат только для основного домена
sudo certbot --nginx -d sybota.space

echo ""
if [ -f "/etc/letsencrypt/live/sybota.space/fullchain.pem" ]; then
    echo "✅ Сертификат успешно получен!"
    echo ""
    echo "Теперь нужно:"
    echo "1. Обновить docker-compose.yml для HTTPS"
    echo "2. Перезапустить контейнеры"
else
    echo "❌ Сертификат не получен. Попробуйте standalone режим:"
    echo "sudo certbot certonly --standalone -d sybota.space"
fi

