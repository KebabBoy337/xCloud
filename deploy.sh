#!/bin/bash

# xCloud Storage - Deploy Script (No PM2)
# Деплой без PM2, только systemd + Node.js

set -e

echo "🚀 xCloud Storage - Deploy Script (No PM2)"
echo "=========================================="

# Проверка root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Запустите с sudo: sudo bash deploy.sh"
    exit 1
fi

# Обновление системы
echo "📦 Обновление системы..."
apt update && apt upgrade -y

# Установка Node.js
echo "📦 Установка Node.js..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# Установка Nginx
echo "🌐 Установка Nginx..."
apt install -y nginx

# Установка Certbot
echo "🔒 Установка Certbot..."
apt install -y certbot python3-certbot-nginx

# Создание пользователя
echo "👤 Создание пользователя xcloud..."
useradd -m -s /bin/bash xcloud 2>/dev/null || echo "Пользователь xcloud уже существует"

# Создание директории
echo "📁 Создание директории..."
mkdir -p /opt/xcloud
cd /opt/xcloud

# Копирование файлов
echo "📋 Копирование файлов..."
cp -r /root/xCloud/* /opt/xcloud/ 2>/dev/null || echo "Файлы уже скопированы"

# Исправление прав доступа
echo "🔧 Исправление прав доступа..."
sudo chown -R xcloud:xcloud /opt/xcloud
sudo chmod -R 755 /opt/xcloud

# Установка зависимостей
echo "📦 Установка зависимостей..."
cd /opt/xcloud
sudo -u xcloud npm install --production

# Создание Important_files директории
echo "📁 Создание Important_files директории..."
mkdir -p /opt/xcloud/Important_files
chown xcloud:xcloud /opt/xcloud/Important_files
chmod 755 /opt/xcloud/Important_files

# Создание prod.env в Important_files
echo "📝 Создание prod.env в Important_files..."
if [ ! -f "/opt/xcloud/Important_files/prod.env" ]; then
    cp /opt/xcloud/example.env /opt/xcloud/Important_files/prod.env
    chown xcloud:xcloud /opt/xcloud/Important_files/prod.env
    chmod 644 /opt/xcloud/Important_files/prod.env
    echo "✅ prod.env создан в Important_files"
else
    echo "ℹ️  prod.env уже существует в Important_files"
fi

# Создание симлинка на prod.env
echo "🔗 Создание симлинка на prod.env..."
if [ ! -f "/opt/xcloud/prod.env" ]; then
    ln -s /opt/xcloud/Important_files/prod.env /opt/xcloud/prod.env
    echo "✅ Симлинк создан: /opt/xcloud/prod.env -> Important_files/prod.env"
else
    echo "ℹ️  Симлинк уже существует"
fi

# Создание systemd сервиса (без PM2)
echo "⚙️ Создание systemd сервиса..."
tee /etc/systemd/system/xcloud.service > /dev/null <<EOF
[Unit]
Description=xCloud Storage Service
After=network.target

[Service]
Type=simple
User=xcloud
Group=xcloud
WorkingDirectory=/opt/xcloud
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
TimeoutStartSec=60
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Перезагрузка systemd
systemctl daemon-reload
systemctl enable xcloud

# Настройка Nginx
echo "🌐 Настройка Nginx..."
tee /etc/nginx/sites-available/xcloud > /dev/null <<EOF
server {
    listen 80;
    server_name cloud.l0.mom;
    client_max_body_size 500M;
    
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
    }
}
EOF

# Активация сайта
ln -sf /etc/nginx/sites-available/xcloud /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Проверка конфигурации Nginx
nginx -t

# Запуск Nginx
systemctl restart nginx
systemctl enable nginx

# Создание self-signed сертификата
echo "🔒 Создание self-signed сертификата..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/ssl-cert-snakeoil.key \
    -out /etc/ssl/certs/ssl-cert-snakeoil.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=cloud.l0.mom"

# Запуск сервиса
echo "🚀 Запуск xCloud Storage..."
systemctl start xcloud

# Ожидание запуска
sleep 5

# Проверка статуса
echo "📊 Проверка статуса..."
systemctl status xcloud --no-pager

# Попытка получить SSL сертификат
echo "🔒 Попытка получения SSL сертификата..."
if nslookup cloud.l0.mom > /dev/null 2>&1; then
    echo "✅ DNS настроен, получаем SSL сертификат..."
    certbot --nginx -d cloud.l0.mom --non-interactive --agree-tos --email admin@cloud.l0.mom || echo "⚠️ Certbot не смог настроить SSL"
else
    echo "⚠️ DNS не настроен, используем self-signed сертификат"
fi

echo ""
echo "🎉 Деплой завершен!"
echo "🌐 Приложение: https://cloud.l0.mom"
echo "📋 Логи: journalctl -u xcloud -f"
echo ""
echo "🔧 НАСТРОЙКА API КЛЮЧЕЙ:"
echo "========================"
echo "1. Отредактируйте API ключи:"
echo "   sudo nano /opt/xcloud/Important_files/prod.env"
echo ""
echo "2. Измените следующие строки:"
echo "   MAIN_API_KEY=your_secure_main_key_here"
echo "   UPLOAD_API_KEY=your_secure_upload_key_here"
echo ""
echo "3. Перезапустите сервис:"
echo "   sudo systemctl restart xcloud"
echo ""
echo "4. Проверьте статус:"
echo "   sudo systemctl status xcloud"
echo ""
echo "📁 ФАЙЛЫ КОНФИГУРАЦИИ:"
echo "======================"
echo "• prod.env: /opt/xcloud/Important_files/prod.env"
echo "• .public_links.json: /opt/xcloud/Important_files/.public_links.json"
echo "• storage: /opt/xcloud/storage/"
echo ""
echo "⚠️  ВАЖНО: Измените API ключи перед использованием!"