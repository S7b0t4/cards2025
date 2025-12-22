# Установка и настройка nginx для sybota.space

## Шаг 1: Установка nginx

Выполните в терминале:

```bash
sudo pacman -S nginx
```

## Шаг 2: Переход в директорию проекта

```bash
cd ~/proj
```

## Шаг 3: Копирование конфигурации

```bash
sudo cp nginx/sybota.space.http.conf /etc/nginx/sites-available/sybota.space
```

## Шаг 4: Создание директории sites-available (если её нет)

На Arch Linux может не быть директории sites-available. Создайте её:

```bash
sudo mkdir -p /etc/nginx/sites-available
sudo mkdir -p /etc/nginx/sites-enabled
```

## Шаг 5: Добавление директив в основной конфиг nginx

Отредактируйте `/etc/nginx/nginx.conf` и добавьте в блок `http` (перед закрывающей скобкой):

```nginx
include /etc/nginx/sites-enabled/*;
```

## Шаг 6: Создание симлинка

```bash
sudo ln -s /etc/nginx/sites-available/sybota.space /etc/nginx/sites-enabled/
```

## Шаг 7: Проверка конфигурации

```bash
sudo nginx -t
```

## Шаг 8: Запуск nginx

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Шаг 9: Перезапуск nginx (если уже был запущен)

```bash
sudo systemctl reload nginx
```

## Шаг 10: Открытие портов

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

Или если используете firewalld:

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## Шаг 11: Перезапуск приложения

```bash
cd ~/proj
docker-compose down
docker-compose up -d --build
```

## Проверка работы

Откройте в браузере: **http://sybota.space**

## Если что-то не работает

Проверьте логи:
```bash
sudo journalctl -u nginx -n 50
sudo tail -f /var/log/nginx/sybota.space.error.log
```

