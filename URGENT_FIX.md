# СРОЧНО: Исправление проблемы с доступностью

## Проблема
Соединение отклоняется (Connection refused) - порт 80 недоступен извне.

## Быстрое решение:

### Вариант 1: Проверьте файрвол вручную

Выполните в терминале:

```bash
# Проверьте все активные файрволы
sudo systemctl status nftables
sudo systemctl status iptables
sudo systemctl status firewalld
sudo systemctl status ufw

# Если какой-то активен - откройте порты или временно отключите
```

### Вариант 2: Проверьте, не блокирует ли провайдер порт 80

Многие провайдеры блокируют входящие соединения на порты 80 и 443 для домашних тарифов.

**Решение:**
1. Позвоните провайдеру и попросите открыть порты 80 и 443
2. Или используйте другой порт (8080) - см. ниже

### Вариант 3: Используйте порт 8080 (если провайдер блокирует 80)

1. **Измените конфигурацию nginx:**

```bash
sudo nano /etc/nginx/sites-available/sybota.space
```

Измените строку:
```nginx
listen 8080;  # было: listen 80;
```

2. **Перезапустите nginx:**
```bash
sudo systemctl reload nginx
```

3. **Откройте порт 8080:**
```bash
# Если используете nftables
sudo nft add rule inet filter input tcp dport 8080 accept

# Или если используете iptables
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
```

4. **Откройте в браузере:** http://sybota.space:8080

### Вариант 4: Проверьте настройки роутера

Если у вас есть роутер:
1. Зайдите в настройки роутера (обычно 192.168.1.1)
2. Найдите "Port Forwarding" или "Виртуальные серверы"
3. Добавьте проброс порта 80 на IP вашего сервера

## Диагностика:

Выполните эти команды и покажите результаты:

```bash
# 1. Проверка, слушает ли nginx на порту 80
ss -tulpn | grep :80

# 2. Проверка статуса nginx
sudo systemctl status nginx

# 3. Проверка доступности локально
curl -I http://localhost -H "Host: sybota.space"

# 4. Проверка всех активных файрволов
sudo systemctl list-units --type=service | grep -E "firewall|iptables|nftables|ufw"
```

## Что делать прямо сейчас:

1. **Проверьте файрвол:**
   ```bash
   sudo systemctl status nftables
   sudo systemctl status iptables
   ```

2. **Если файрвол активен - откройте порты:**
   ```bash
   # Для nftables
   sudo nft add rule inet filter input tcp dport 80 accept
   
   # Для iptables
   sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
   ```

3. **Или временно отключите файрвол для проверки:**
   ```bash
   sudo systemctl stop nftables
   # Попробуйте открыть сайт
   # Если заработало - проблема в файрволе
   ```

4. **Если не помогло - используйте порт 8080** (см. Вариант 3 выше)


