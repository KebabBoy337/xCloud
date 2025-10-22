#!/bin/bash

# xCloud Storage - Force Update Script
# Принудительное обновление с GitHub

echo "🔄 xCloud Storage - Force Update from GitHub"
echo "============================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка, что мы в правильной директории
if [ ! -f "package.json" ] || [ ! -f "server.js" ]; then
    print_error "Этот скрипт должен быть запущен в корневой директории xCloud проекта"
    exit 1
fi

# Остановка сервисов
print_status "Остановка сервисов..."
sudo systemctl stop xcloud 2>/dev/null || true
sudo -u xcloud pm2 stop xcloud-storage 2>/dev/null || true
sudo -u xcloud pm2 kill 2>/dev/null || true

# Сохранение prod.env
print_status "Сохранение prod.env..."
if [ -f "prod.env" ]; then
    cp prod.env /tmp/prod.env.backup
    print_status "prod.env сохранен в /tmp/prod.env.backup"
fi

# Принудительное обновление
print_status "Принудительное обновление с GitHub..."
git fetch origin
git reset --hard origin/main
git clean -fd

# Восстановление prod.env
print_status "Восстановление prod.env..."
if [ -f "/tmp/prod.env.backup" ]; then
    cp /tmp/prod.env.backup prod.env
    rm /tmp/prod.env.backup
    print_status "prod.env восстановлен"
elif [ -f "example.env" ]; then
    cp example.env prod.env
    print_status "prod.env создан из example.env"
else
    print_warning "Не удалось восстановить prod.env, создайте его вручную"
fi

# Установка зависимостей
print_status "Установка зависимостей..."
npm install --production

# Перезапуск сервисов
print_status "Перезапуск сервисов..."
sudo systemctl start xcloud

# Проверка статуса
print_status "Проверка статуса..."
sleep 3

if sudo systemctl is-active --quiet xcloud; then
    print_status "✅ Сервис xcloud запущен успешно"
else
    print_error "❌ Сервис xcloud не запустился"
    print_status "Проверьте логи: sudo journalctl -u xcloud -f"
    exit 1
fi

echo ""
echo "🎉 Принудительное обновление завершено!"
echo "======================================"
echo ""
echo "📊 Статус сервисов:"
echo "   systemctl status xcloud"
echo "   pm2 list"
echo ""
echo "🌐 Приложение доступно по адресу:"
echo "   https://cloud.l0.mom"
