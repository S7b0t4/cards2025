#!/bin/bash
# Скрипт для корректной сборки frontend с multi-stage build
# Решает проблему "layer does not exist" при копировании из builder stage

set -e

cd "$(dirname "$0")/frontend"

echo "Сборка builder stage..."
docker build -t frontend-builder:temp --target builder .

echo "Сборка production образа..."
# Создаем временный Dockerfile с явным указанием builder образа
cat > Dockerfile.temp << 'DOCKERFILE'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
# Используем сохраненный builder образ
COPY --from=frontend-builder:temp /app/.next ./.next
COPY --from=frontend-builder:temp /app/package.json ./package.json
COPY --from=frontend-builder:temp /app/public ./public
EXPOSE 3003
ENV PORT=3003
CMD ["npm", "start"]
DOCKERFILE

docker build -f Dockerfile.temp -t proj-frontend:latest .
rm -f Dockerfile.temp
docker rmi frontend-builder:temp 2>/dev/null || true

echo "Сборка завершена успешно!"





























