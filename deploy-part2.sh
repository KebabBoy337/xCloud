#!/bin/bash

# xCloud Storage - Part 2 Deployment Script
# Вторая часть развертывания (после PM2)

set -e

echo "🚀 Продолжаем развертывание xCloud Storage (Part 2)..."

# Переходим в директорию приложения
cd /opt/xcloud

# Проверяем статус PM2
echo "📊 Проверка статуса PM2..."
sudo -u xcloud pm2 list

# Установка Certbot для SSL
echo "📦 Установка Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Настройка Nginx (сначала только HTTP)
echo "⚙️ Настройка Nginx..."
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

# Активация сайта
sudo ln -sf /etc/nginx/sites-available/xcloud /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Проверка конфигурации Nginx
sudo nginx -t

# Перезапуск сервисов
echo "🔄 Перезапуск сервисов..."
sudo systemctl restart nginx
sudo systemctl enable nginx

# Настройка файрвола
echo "🔥 Настройка файрвола..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Создание systemd сервиса для PM2
echo "⚙️ Создание systemd сервиса..."
sudo tee /etc/systemd/system/xcloud.service > /dev/null <<EOF
[Unit]
Description=xCloud Storage Service
After=network.target

[Service]
Type=simple
User=xcloud
Group=xcloud
WorkingDirectory=/opt/xcloud
ExecStart=/usr/bin/pm2-runtime start ecosystem.config.js
Restart=always
RestartSec=5
TimeoutStartSec=60
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Создание self-signed SSL сертификата
echo "🔒 Создание self-signed SSL сертификата..."
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/ssl-cert-snakeoil.key \
    -out /etc/ssl/certs/ssl-cert-snakeoil.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=cloud.l0.mom"

# Остановка и очистка проблемного сервиса
echo "🔧 Исправление проблемного сервиса..."
sudo systemctl stop xcloud 2>/dev/null || true
sudo systemctl reset-failed xcloud 2>/dev/null || true
sudo -u xcloud pm2 kill 2>/dev/null || true

# Активация сервиса
sudo systemctl daemon-reload
sudo systemctl enable xcloud
sudo systemctl start xcloud

# Проверка статуса
echo "📊 Проверка статуса сервиса..."
sudo systemctl status xcloud --no-pager

# Проверка DNS и настройка SSL сертификата
echo "🔍 Проверка DNS для cloud.l0.mom..."
if nslookup cloud.l0.mom > /dev/null 2>&1; then
    echo "✅ DNS запись найдена, настраиваем Let's Encrypt сертификат..."
    sudo certbot --nginx -d cloud.l0.mom --non-interactive --agree-tos --email admin@cloud.l0.mom
    echo "✅ Let's Encrypt сертификат настроен!"
else
    echo "⚠️  DNS запись не найдена, используем self-signed сертификат"
    echo "📝 Для получения настоящего SSL сертификата:"
    echo "   1. Настройте DNS запись A для cloud.l0.mom -> ваш IP"
    echo "   2. Запустите: sudo certbot --nginx -d cloud.l0.mom"
fi

echo ""
echo "✅ Развертывание Part 2 завершено!"
echo ""
echo "🔑 API Ключи:"
echo "   Main Key: main_key_2024_secure_12345"
echo "   Upload Key: upload_key_2024_secure_67890"
echo ""
echo "🌐 Доступ к приложению:"
echo "   https://cloud.l0.mom (с SSL сертификатом)"
echo "   http://cloud.l0.mom (автоматически перенаправляется на HTTPS)"
echo ""
echo "📋 Управление сервисом:"
echo "   xcloud start    - запустить"
echo "   xcloud stop     - остановить"
echo "   xcloud restart  - перезапустить"
echo "   xcloud status   - статус"
echo "   xcloud logs     - логи"
echo ""
echo "🔒 Для настройки SSL сертификата (Let's Encrypt):"
echo "   xcloud-ssl"
echo ""
echo "📁 Файлы хранятся в: /opt/xcloud/storage"
echo "📋 Логи в: /var/log/xcloud/"
echo ""
