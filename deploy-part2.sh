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

# Настройка Nginx с HTTPS
echo "⚙️ Настройка Nginx с HTTPS..."
sudo tee /etc/nginx/sites-available/xcloud > /dev/null <<EOF
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name 151.243.208.2 _;
    return 301 https://151.243.208.2\$request_uri;
}

# HTTPS configuration
server {
    listen 443 ssl http2;
    server_name 151.243.208.2 _;
    
    # SSL configuration (will be updated by certbot)
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
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
        proxy_set_header X-Forwarded-Proto https;
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
Type=forking
User=xcloud
Group=xcloud
WorkingDirectory=/opt/xcloud
ExecStart=/usr/bin/pm2 start ecosystem.config.js --no-daemon
ExecReload=/usr/bin/pm2 reload ecosystem.config.js
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Остановка и очистка проблемного сервиса
echo "🔧 Исправление проблемного сервиса..."
sudo systemctl stop xcloud 2>/dev/null || true
sudo systemctl reset-failed xcloud 2>/dev/null || true

# Активация сервиса
sudo systemctl daemon-reload
sudo systemctl enable xcloud
sudo systemctl start xcloud

# Проверка статуса
echo "📊 Проверка статуса сервиса..."
sudo systemctl status xcloud --no-pager

# Если сервис не запустился, исправляем
if ! sudo systemctl is-active --quiet xcloud; then
    echo "⚠️  Сервис не запустился, исправляем..."
    sudo systemctl reset-failed xcloud
    sudo -u xcloud pm2 kill 2>/dev/null || true
    sudo systemctl restart xcloud
    sleep 5
    sudo systemctl status xcloud --no-pager
fi

# Автоматическая настройка SSL для localhost (self-signed)
echo "🔒 Настройка self-signed SSL для 151.243.208.2..."
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/ssl-cert-snakeoil.key \
    -out /etc/ssl/certs/ssl-cert-snakeoil.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=151.243.208.2"

# Автоматическая настройка SSL сертификата
echo "🔒 Настройка SSL сертификата для 151.243.208.2..."
sudo certbot --nginx -d 151.243.208.2 --non-interactive --agree-tos --email admin@151.243.208.2 || echo "⚠️  Certbot не смог настроить SSL, используем self-signed"

echo ""
echo "✅ Развертывание Part 2 завершено!"
echo ""
echo "🔑 API Ключи:"
echo "   Main Key: main_key_2024_secure_12345"
echo "   Upload Key: upload_key_2024_secure_67890"
echo ""
echo "🌐 Доступ к приложению:"
echo "   https://151.243.208.2 (с SSL сертификатом)"
echo "   http://151.243.208.2 (автоматически перенаправляется на HTTPS)"
echo ""
echo "📋 Управление сервисом:"
echo "   xcloud start    - запустить"
echo "   xcloud stop     - остановить"
echo "   xcloud restart  - перезапустить"
echo "   xcloud status   - статус"
echo "   xcloud logs     - логи"
echo "   xcloud fix      - исправить проблемный сервис"
echo ""
echo "🔒 Для настройки SSL сертификата (Let's Encrypt):"
echo "   xcloud-ssl"
echo ""
echo "📁 Файлы хранятся в: /opt/xcloud/storage"
echo "📋 Логи в: /var/log/xcloud/"
echo ""
echo "⚠️  При первом заходе браузер покажет предупреждение о self-signed сертификате"
echo "   Нажмите 'Дополнительно' -> 'Перейти на сайт' для продолжения"
