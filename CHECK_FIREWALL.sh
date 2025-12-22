#!/bin/bash
# Скрипт для проверки и настройки файрвола

echo "=== Проверка файрвола ==="

# Проверка nftables
if command -v nft &> /dev/null; then
    echo "Проверка nftables..."
    sudo nft list ruleset 2>/dev/null | grep -E "80|443" || echo "Правила для портов 80/443 не найдены в nftables"
fi

# Проверка iptables
if command -v iptables-legacy &> /dev/null; then
    echo "Проверка iptables-legacy..."
    sudo iptables-legacy -L INPUT -n -v | grep -E "80|443" || echo "Правила для портов 80/443 не найдены в iptables"
fi

# Проверка firewalld
if systemctl is-active --quiet firewalld 2>/dev/null; then
    echo "Проверка firewalld..."
    sudo firewall-cmd --list-all
fi

# Проверка ufw
if command -v ufw &> /dev/null; then
    echo "Проверка ufw..."
    sudo ufw status
fi

echo ""
echo "=== Рекомендации ==="
echo "Если порты 80/443 не открыты, выполните одну из команд:"
echo ""
echo "Для nftables:"
echo "  sudo nft add rule inet filter input tcp dport 80 accept"
echo "  sudo nft add rule inet filter input tcp dport 443 accept"
echo ""
echo "Для iptables:"
echo "  sudo iptables-legacy -A INPUT -p tcp --dport 80 -j ACCEPT"
echo "  sudo iptables-legacy -A INPUT -p tcp --dport 443 -j ACCEPT"
echo ""
echo "Для firewalld:"
echo "  sudo firewall-cmd --permanent --add-service=http"
echo "  sudo firewall-cmd --permanent --add-service=https"
echo "  sudo firewall-cmd --reload"

