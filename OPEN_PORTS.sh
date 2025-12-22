#!/bin/bash
# Скрипт для открытия портов 80 и 443

echo "=== Открытие портов 80 и 443 ==="

# Проверка nftables
if systemctl is-active --quiet nftables 2>/dev/null || command -v nft &> /dev/null; then
    echo "Используется nftables"
    
    # Проверяем, есть ли уже правила
    if sudo nft list ruleset 2>/dev/null | grep -q "tcp dport 80"; then
        echo "Правила для порта 80 уже существуют"
    else
        echo "Добавление правил для портов 80 и 443..."
        sudo nft add rule inet filter input tcp dport 80 accept
        sudo nft add rule inet filter input tcp dport 443 accept
        echo "Правила добавлены"
    fi
    
    # Сохраняем правила
    if [ -f /etc/nftables.conf ]; then
        echo "Сохранение правил в /etc/nftables.conf..."
        sudo nft list ruleset > /tmp/nftables.conf
        sudo mv /tmp/nftables.conf /etc/nftables.conf
    fi
fi

# Проверка iptables
if command -v iptables-legacy &> /dev/null; then
    echo "Проверка iptables-legacy..."
    if ! sudo iptables-legacy -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null; then
        echo "Добавление правил iptables для портов 80 и 443..."
        sudo iptables-legacy -A INPUT -p tcp --dport 80 -j ACCEPT
        sudo iptables-legacy -A INPUT -p tcp --dport 443 -j ACCEPT
    fi
fi

echo ""
echo "=== Проверка ==="
echo "Проверьте доступность:"
echo "  curl -I http://46.191.230.86"
echo "  curl -I http://sybota.space"

