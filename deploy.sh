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

# Ждем запуска PM2
echo "⏳ Ожидание запуска PM2..."
sleep 5

# Проверяем статус PM2
echo "📊 Статус PM2:"
sudo -u xcloud pm2 list

echo ""
echo "✅ Первая часть развертывания завершена!"
echo "📋 PM2 запущен и работает"
echo ""
echo "🚀 Для завершения развертывания запустите:"
echo "   sudo bash deploy-part2.sh"
echo ""
echo "⏳ Или подождите 10 секунд для автоматического продолжения..."
sleep 10

# Установка Certbot для SSL
echo "📦 Установка Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Настройка Nginx с HTTPS
echo "⚙️ Настройка Nginx с HTTPS..."
sudo tee /etc/nginx/sites-available/xcloud > /dev/null <<EOF
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name cloud.l0.mom _;
    return 301 https://cloud.l0.mom\$request_uri;
}

# HTTPS configuration
server {
    listen 443 ssl http2;
    server_name cloud.l0.mom _;
    
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
echo "🔒 Настройка SSL сертификата для домена: cloud.l0.mom"

# Настройка SSL для домена
echo "🔧 Настройка SSL для домена: cloud.l0.mom"
sudo certbot --nginx -d cloud.l0.mom --non-interactive --agree-tos --email admin@cloud.l0.mom

echo "✅ SSL сертификат настроен!"
echo "🌐 Приложение доступно по адресу: https://cloud.l0.mom"
EOF

sudo chmod +x /usr/local/bin/xcloud-ssl

# Создание self-signed SSL сертификата
echo "🔒 Создание self-signed SSL сертификата..."
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/ssl-cert-snakeoil.key \
    -out /etc/ssl/certs/ssl-cert-snakeoil.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=cloud.l0.mom"

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
echo "✅ Развертывание завершено!"
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
