#!/bin/bash

# xCloud Storage - SSL Setup Script
# Настройка настоящего SSL сертификата через Let's Encrypt

echo "🔒 Настройка SSL сертификата для cloud.l0.mom"

# Проверка DNS
echo "🔍 Проверка DNS записи..."
if nslookup cloud.l0.mom > /dev/null 2>&1; then
    echo "✅ DNS запись найдена"
    echo "🌐 cloud.l0.mom -> $(nslookup cloud.l0.mom | grep -A1 "Name:" | tail -1 | awk '{print $2}')"
else
    echo "❌ DNS запись не найдена!"
    echo ""
    echo "📝 Настройте DNS запись:"
    echo "   1. Зайдите в панель управления вашего домена"
    echo "   2. Создайте A запись: cloud.l0.mom -> 151.243.208.2"
    echo "   3. Подождите 5-10 минут для распространения DNS"
    echo "   4. Запустите этот скрипт снова"
    exit 1
fi

# Очистка старых сертификатов и nginx конфигурации
echo "🧹 Очистка старых сертификатов..."
sudo certbot delete --cert-name cloud.l0.mom 2>/dev/null || echo "Старых сертификатов нет"

# Создание чистой nginx конфигурации без SSL
echo "📝 Создание чистой nginx конфигурации..."
sudo tee /etc/nginx/sites-available/xcloud > /dev/null <<EOF
# HTTP server (will be updated by certbot)
server {
    listen 80;
    server_name cloud.l0.mom _;
    
    # Максимальный размер загружаемого файла
    client_max_body_size 100M;
    
    # Static files caching
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 1d;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Таймауты для больших файлов
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
EOF

# Проверка и перезапуск nginx
echo "🔧 Проверка nginx конфигурации..."
sudo nginx -t
sudo systemctl restart nginx

# Настройка SSL сертификата
echo "🔧 Настройка Let's Encrypt сертификата..."
sudo certbot --nginx -d cloud.l0.mom --non-interactive --agree-tos --email admin@cloud.l0.mom

# Проверка сертификата
echo "📊 Проверка SSL сертификата..."
sudo certbot certificates

echo ""
echo "✅ SSL сертификат настроен!"
echo "🌐 Приложение доступно по адресу: https://cloud.l0.mom"
echo "🔒 Теперь браузер не будет показывать предупреждения о безопасности"
