#!/bin/bash

# xCloud Storage - Local HTTPS Development
# Быстрый запуск с HTTPS для локальной разработки

echo "🔒 Запуск xCloud Storage с HTTPS..."

# Создание self-signed сертификата для localhost
if [ ! -f "localhost.crt" ] || [ ! -f "localhost.key" ]; then
    echo "📜 Создание self-signed SSL сертификата..."
    openssl req -x509 -newkey rsa:2048 -keyout localhost.key -out localhost.crt -days 365 -nodes \
        -subj "/C=US/ST=State/L=City/O=xCloud/CN=localhost"
    echo "✅ SSL сертификат создан"
fi

# Запуск сервера с HTTPS
echo "🚀 Запуск сервера на https://localhost:3000"
echo "⚠️  Браузер покажет предупреждение о сертификате - нажмите 'Дополнительно' -> 'Перейти на сайт'"
echo ""

# Установка переменной окружения для HTTPS
export NODE_ENV=development
export HTTPS=true

# Запуск с nodemon
nodemon server.js

