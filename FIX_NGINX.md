# Исправление проблемы с nginx

## Проблема
Ошибка: `"server" directive is not allowed here` - конфигурация включается в неправильном месте.

## Решение 1: Удалить include из блока events

Выполните:

```bash
sudo sed -i '/^events {/,/^}$/ { /include \/etc\/nginx\/sites-enabled\/\*;/d; }' /etc/nginx/nginx.conf
```

Или отредактируйте вручную:

```bash
sudo nano /etc/nginx/nginx.conf
```

Удалите строку `include /etc/nginx/sites-enabled/*;` из блока `events { ... }`.

## Решение 2: Добавить конфигурацию напрямую в nginx.conf

Если не хотите использовать sites-enabled, добавьте конфигурацию напрямую:

1. Откройте `/etc/nginx/nginx.conf`:
```bash
sudo nano /etc/nginx/nginx.conf
```

2. Найдите блок `http { ... }` и добавьте перед закрывающей скобкой:

```nginx
http {
    # ... существующие директивы ...
    
    # Конфигурация для sybota.space
    server {
        listen 80;
        listen [::]:80;
        server_name sybota.space www.sybota.space;

        access_log /var/log/nginx/sybota.space.access.log;
        error_log /var/log/nginx/sybota.space.error.log;
        client_max_body_size 10M;

        location ~ ^/(api|auth|cards|users) {
            proxy_pass http://127.0.0.1:3002;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        location / {
            proxy_pass http://127.0.0.1:3003;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
    }
}
```

3. Удалите симлинк (если создавали):
```bash
sudo rm /etc/nginx/sites-enabled/sybota.space
```

## После исправления

Проверьте конфигурацию:
```bash
sudo nginx -t
```

Если всё ок, запустите nginx:
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

Проверьте статус:
```bash
sudo systemctl status nginx
```

