#!/bin/bash

# xCloud Storage - Cleanup Old Files
# Удаляет старые файлы из /opt/xcloud

echo "🧹 xCloud Storage - Cleanup Old Files"
echo "===================================="

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

# Проверка root прав
if [ "$EUID" -ne 0 ]; then
    print_error "Запустите с sudo: sudo bash cleanup-old-files.sh"
    exit 1
fi

# Проверка, что /opt/xcloud существует
if [ ! -d "/opt/xcloud" ]; then
    print_error "Директория /opt/xcloud не найдена"
    exit 1
fi

print_status "Остановка сервиса xcloud..."
systemctl stop xcloud

print_status "Удаление старых файлов..."

# Удаляем старые файлы
cd /opt/xcloud

# Удаляем старые скрипты
rm -f check-config.js
rm -f restart.sh
rm -f quick-update.sh
rm -f force-update.sh
rm -f deploy-part2.sh
rm -f setup-ssl.sh
rm -f cleanup.sh

print_status "Старые файлы удалены"

print_status "Исправление прав доступа..."
chown -R xcloud:xcloud /opt/xcloud
chmod -R 755 /opt/xcloud

print_status "Запуск сервиса xcloud..."
systemctl start xcloud

print_status "Ожидание запуска..."
sleep 3

# Проверка статуса
if systemctl is-active --quiet xcloud; then
    print_status "✅ Сервис xcloud запущен успешно"
else
    print_error "❌ Сервис xcloud не запустился"
    print_status "Проверьте логи: journalctl -u xcloud -f"
    exit 1
fi

echo ""
echo "🎉 Очистка завершена!"
echo "===================="
echo ""
echo "📊 Статус: systemctl status xcloud"
echo "📋 Логи: journalctl -u xcloud -f"
