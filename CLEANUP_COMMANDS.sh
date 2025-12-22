#!/bin/bash
# Скрипт для безопасной очистки диска

echo "=== Очистка диска ==="
echo ""

# 1. Docker очистка (освободит ~3-4GB)
echo "1. Очистка Docker..."
echo "   Удаление неиспользуемых образов, контейнеров и volumes..."
docker system prune -a --volumes -f
echo "   ✅ Docker очищен"
echo ""

# 2. Очистка кеша pacman (освободит ~929MB)
echo "2. Очистка кеша pacman..."
sudo pacman -Sc --noconfirm
echo "   ✅ Кеш pacman очищен"
echo ""

# 3. Очистка кеша debtap (освободит ~1.1GB)
echo "3. Очистка кеша debtap..."
sudo rm -rf /var/cache/debtap/*
echo "   ✅ Кеш debtap очищен"
echo ""

# 4. Очистка кеша pkgfile (освободит ~520MB)
echo "4. Очистка кеша pkgfile..."
sudo pkgfile -u 2>/dev/null || sudo rm -rf /var/cache/pkgfile/*
echo "   ✅ Кеш pkgfile очищен"
echo ""

# 5. Очистка кеша yay (освободит ~387MB)
echo "5. Очистка кеша yay..."
yay -Sc --noconfirm 2>/dev/null || rm -rf ~/.cache/yay/*
echo "   ✅ Кеш yay очищен"
echo ""

# 6. Очистка старых логов (освободит ~100-200MB)
echo "6. Очистка старых логов..."
sudo journalctl --vacuum-time=7d
echo "   ✅ Логи очищены"
echo ""

# 7. Удаление неиспользуемых пакетов
echo "7. Удаление неиспользуемых пакетов..."
UNUSED=$(pacman -Qtdq 2>/dev/null)
if [ -n "$UNUSED" ]; then
    echo "   Найдено неиспользуемых пакетов. Удаление..."
    sudo pacman -Rns $UNUSED --noconfirm
    echo "   ✅ Неиспользуемые пакеты удалены"
else
    echo "   Неиспользуемых пакетов не найдено"
fi
echo ""

echo "=== Результат ==="
df -h / | tail -1
echo ""
echo "✅ Очистка завершена!"


