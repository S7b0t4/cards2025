#!/bin/bash
# Скрипт для получения SSL сертификата через standalone режим

echo "Получение SSL сертификата для sybota.space через standalone режим..."
echo ""
echo "ВНИМАНИЕ: nginx будет временно остановлен!"
echo ""

# Останавливаем nginx
echo "Остановка nginx..."
sudo systemctl stop nginx

# Получаем сертификат
echo "Получение сертификата..."
sudo certbot certonly --standalone -d sybota.space -d www.sybota.space

# Запускаем nginx обратно
echo "Запуск nginx..."
sudo systemctl start nginx

echo ""
if [ -f "/etc/letsencrypt/live/sybota.space/fullchain.pem" ]; then
    echo "✅ Сертификат успешно получен!"
    echo ""
    echo "Теперь нужно:"
    echo "1. Обновить конфигурацию nginx для HTTPS"
    echo "2. Обновить docker-compose.yml для HTTPS"
    echo "3. Перезапустить контейнеры"
else
    echo "❌ Сертификат не получен. Проверьте логи:"
    echo "sudo tail -50 /var/log/letsencrypt/letsencrypt.log"
fi

