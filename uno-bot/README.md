# UNO Telegram Bot Microservice

Отдельный микросервис для игры в UNO в Telegram.

## Установка

```bash
npm install
```

## Настройка

Создайте файл `.env`:
```
UNO_BOT_TOKEN=ваш_токен_от_BotFather
```

## Запуск

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Docker
```bash
docker build -t uno-bot .
docker run -d --env-file .env uno-bot
```

## Команды бота

- `/start` - Приветствие и инструкции
- `/uno_start` - Создать игру или присоединиться
- `/uno_join` - Присоединиться к игре
- `/uno_go` - Начать игру (минимум 2 игрока)
- `/uno_leave` - Покинуть игру

## Особенности

- Полностью независимый микросервис
- Не требует базы данных
- Все игры хранятся в памяти
- Карты отправляются в личные сообщения



