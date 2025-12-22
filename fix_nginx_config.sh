#!/bin/bash
# Скрипт для исправления конфигурации nginx

# Добавить include в блок http (перед закрывающей скобкой)
if ! grep -q "include /etc/nginx/sites-enabled/\*;" /etc/nginx/nginx.conf; then
    echo "Добавляю include в блок http..."
    sudo sed -i '/^}$/i\    include /etc/nginx/sites-enabled/*;' /etc/nginx/nginx.conf
fi

# Закомментировать дефолтный server с localhost
echo "Комментирую дефолтный server..."
sudo sed -i '/server_name.*localhost/,/^    }/ s/^/#/' /etc/nginx/nginx.conf

echo "Готово! Проверьте конфигурацию: sudo nginx -t"

