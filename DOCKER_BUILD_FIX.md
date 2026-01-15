# Решение проблемы сборки Docker frontend "layer does not exist"

## Проблема
При сборке multi-stage Docker образа для frontend возникала ошибка:
```
failed to export image: failed to create image: failed to get layer sha256:...: layer does not exist
```

Это происходит, когда Docker удаляет промежуточные слои builder stage до того, как второй stage может скопировать из него файлы.

## Решение

Используйте скрипт `build-frontend.sh` для корректной сборки:

```bash
./build-frontend.sh
```

Скрипт:
1. Сначала собирает builder stage как отдельный образ с тегом `frontend-builder:temp`
2. Создает временный Dockerfile, который использует этот сохраненный образ
3. Собирает production образ, используя сохраненный builder
4. Удаляет временный builder образ после сборки

## Альтернативное решение

Если нужно собрать через docker-compose, можно временно изменить процесс:
1. Собрать builder: `docker build -t frontend-builder:temp --target builder ./frontend`
2. Изменить Dockerfile, чтобы использовать `COPY --from=frontend-builder:temp` вместо `COPY --from=builder`
3. Собрать через `docker-compose build frontend`
4. Вернуть оригинальный Dockerfile

## Причина проблемы

Legacy Docker builder иногда удаляет промежуточные слои multi-stage builds слишком быстро, особенно когда второй stage пытается копировать файлы из первого stage. BuildKit решает эту проблему, но если он не установлен, нужен обходной путь с явным сохранением builder образа.





























