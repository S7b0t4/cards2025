FROM node:20-alpine

WORKDIR /app

# Копируем package files
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Компилируем TypeScript
RUN npm run build

# Запускаем приложение
CMD ["node", "dist/index.js"]



