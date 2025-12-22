# Исправление проблемы с файрволом

## Проблема
Сайт недоступен извне - ошибка "connection refused".

## Решение

### 1. Проверьте, какой файрвол используется

```bash
# Проверьте iptables
sudo iptables -L -n -v | head -20

# Проверьте firewalld
sudo firewall-cmd --list-all 2>/dev/null

# Проверьте ufw
sudo ufw status
```

### 2. Откройте порты

#### Если используете iptables напрямую:

```bash
# Разрешить входящие соединения на порт 80
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Сохраните правила
sudo iptables-save | sudo tee /etc/iptables/iptables.rules
```

#### Если используете firewalld:

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

#### Если используете ufw:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

### 3. Проверьте, что nginx слушает на всех интерфейсах

```bash
ss -tulpn | grep :80
```

Должно быть: `0.0.0.0:80` (не `127.0.0.1:80`)

### 4. Проверьте доступность напрямую по IP

```bash
# С другого компьютера или через curl
curl -I http://46.191.230.86
```

### 5. Проверьте DNS

```bash
dig sybota.space
```

Должен указывать на 46.191.230.86

### 6. Проверьте, не блокирует ли провайдер/роутер

- Убедитесь, что порты 80 и 443 открыты в роутере (если есть)
- Проверьте, не блокирует ли провайдер входящие соединения

### 7. Альтернатива: Используйте другой порт

Если провайдер блокирует порты 80/443, можно настроить nginx на другой порт (например, 8080) и пробросить его через роутер.

