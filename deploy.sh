#!/bin/bash

# xCloud Storage Deployment Script for Ubuntu
# Автоматический скрипт развертывания

set -e

echo "🚀 Начинаем развертывание xCloud Storage..."

# Обновление системы
echo "📦 Обновление системы..."
sudo apt update && sudo apt upgrade -y

# Установка Node.js (LTS версия)
echo "📦 Установка Node.js..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка PM2 для управления процессами
echo "📦 Установка PM2..."
sudo npm install -g pm2

# Установка nginx
echo "📦 Установка Nginx..."
sudo apt install -y nginx

# Создание пользователя для приложения
echo "👤 Создание пользователя..."
sudo useradd -m -s /bin/bash xcloud || echo "Пользователь xcloud уже существует"

# Создание директорий
echo "📁 Создание директорий..."
sudo mkdir -p /opt/xcloud
sudo mkdir -p /opt/xcloud/logs
sudo mkdir -p /opt/xcloud/storage
sudo mkdir -p /var/log/xcloud

# Копирование файлов
echo "📋 Копирование файлов..."
sudo cp -r . /opt/xcloud/
sudo chown -R xcloud:xcloud /opt/xcloud
sudo chown -R xcloud:xcloud /var/log/xcloud

# Установка зависимостей
echo "📦 Установка зависимостей..."
cd /opt/xcloud
sudo -u xcloud npm install --production

# Настройка PM2
echo "⚙️ Настройка PM2..."
sudo -u xcloud pm2 start ecosystem.config.js
sudo -u xcloud pm2 save
sudo -u xcloud pm2 startup

# Установка Certbot для SSL
echo "📦 Установка Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Настройка Nginx с HTTPS
echo "⚙️ Настройка Nginx с HTTPS..."
sudo tee /etc/nginx/sites-available/xcloud > /dev/null <<EOF
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name _;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS configuration
server {
    listen 443 ssl http2;
    server_name _;
    
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
WorkingDirectory=/opt/xcloud
ExecStart=/usr/bin/pm2 start ecosystem.config.js
ExecReload=/usr/bin/pm2 reload all
ExecStop=/usr/bin/pm2 stop all
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Активация сервиса
sudo systemctl daemon-reload
sudo systemctl enable xcloud
sudo systemctl start xcloud

# Создание скрипта для управления
echo "📝 Создание скрипта управления..."
sudo tee /usr/local/bin/xcloud > /dev/null <<EOF
#!/bin/bash
case "\$1" in
    start)
        sudo systemctl start xcloud
        ;;
    stop)
        sudo systemctl stop xcloud
        ;;
    restart)
        sudo systemctl restart xcloud
        ;;
    status)
        sudo systemctl status xcloud
        ;;
    logs)
        sudo journalctl -u xcloud -f
        ;;
    *)
        echo "Использование: xcloud {start|stop|restart|status|logs}"
        exit 1
        ;;
esac
EOF

sudo chmod +x /usr/local/bin/xcloud

# Создание скрипта для SSL (Let's Encrypt)
echo "📝 Создание скрипта SSL..."
sudo tee /usr/local/bin/xcloud-ssl > /dev/null <<EOF
#!/bin/bash
echo "🔒 Настройка SSL сертификата..."
echo "Введите доменное имя (например: example.com):"
read domain

if [ -z "\$domain" ]; then
    echo "❌ Доменное имя не указано"
    exit 1
fi

echo "🔧 Настройка SSL для домена: \$domain"
sudo certbot --nginx -d \$domain --non-interactive --agree-tos --email admin@\$domain

echo "✅ SSL сертификат настроен!"
echo "🌐 Приложение доступно по адресу: https://\$domain"
EOF

sudo chmod +x /usr/local/bin/xcloud-ssl

# Автоматическая настройка SSL для localhost (self-signed)
echo "🔒 Настройка self-signed SSL для localhost..."
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/ssl-cert-snakeoil.key \
    -out /etc/ssl/certs/ssl-cert-snakeoil.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

echo ""
echo "✅ Развертывание завершено!"
echo ""
echo "🔑 API Ключи:"
echo "   Main Key: main_key_2024_secure_12345"
echo "   Upload Key: upload_key_2024_secure_67890"
echo ""
echo "🌐 Доступ к приложению:"
echo "   https://your-server-ip (с self-signed сертификатом)"
echo "   http://your-server-ip (автоматически перенаправляется на HTTPS)"
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
echo "⚠️  При первом заходе браузер покажет предупреждение о self-signed сертификате"
echo "   Нажмите 'Дополнительно' -> 'Перейти на сайт' для продолжения"
