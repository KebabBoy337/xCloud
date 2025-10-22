#!/bin/bash

# xCloud Storage - Restart Services Script
# Полный перезапуск сервисов для применения новой конфигурации

echo "🔄 xCloud Storage - Restarting Services"
echo "======================================"

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

# Остановка всех сервисов
print_status "Остановка всех сервисов..."
sudo systemctl stop xcloud 2>/dev/null || true
sudo -u xcloud pm2 stop xcloud-storage 2>/dev/null || true
sudo -u xcloud pm2 kill 2>/dev/null || true

# Ожидание полной остановки
print_status "Ожидание остановки процессов..."
sleep 3

# Убиваем все процессы Node.js
print_status "Завершение всех процессов Node.js..."
sudo pkill -f "node.*server.js" 2>/dev/null || true
sudo pkill -f "xcloud" 2>/dev/null || true

# Очистка кэша Node.js
print_status "Очистка кэша Node.js..."
sudo rm -rf /tmp/.pm2* 2>/dev/null || true
sudo rm -rf /home/xcloud/.pm2/logs/* 2>/dev/null || true

# Проверка конфигурации
print_status "Проверка конфигурации..."
if [ ! -f "prod.env" ]; then
    print_error "prod.env не найден!"
    exit 1
fi

# Показываем текущие ключи
print_status "Текущие API ключи в prod.env:"
echo "MAIN_API_KEY: $(grep MAIN_API_KEY prod.env | cut -d'=' -f2)"
echo "UPLOAD_API_KEY: $(grep UPLOAD_API_KEY prod.env | cut -d'=' -f2)"

# Запуск сервисов
print_status "Запуск сервисов..."
sudo systemctl start xcloud

# Ожидание запуска
print_status "Ожидание запуска сервисов..."
sleep 5

# Проверка статуса
print_status "Проверка статуса сервисов..."
if sudo systemctl is-active --quiet xcloud; then
    print_status "✅ Сервис xcloud запущен"
else
    print_error "❌ Сервис xcloud не запустился"
    print_status "Проверьте логи: sudo journalctl -u xcloud -f"
    exit 1
fi

# Проверка PM2
if sudo -u xcloud pm2 list | grep -q "xcloud-storage.*online"; then
    print_status "✅ PM2 процесс запущен"
else
    print_warning "⚠️  PM2 процесс не найден, попытка запуска..."
    sudo -u xcloud pm2 start ecosystem.config.js
fi

# Финальная проверка
print_status "Финальная проверка..."
sleep 2

# Проверка доступности
if curl -s http://localhost:3000/api/health > /dev/null; then
    print_status "✅ Приложение отвечает на запросы"
else
    print_warning "⚠️  Приложение не отвечает на localhost:3000"
fi

echo ""
echo "🎉 Перезапуск завершен!"
echo "======================"
echo ""
echo "📊 Статус сервисов:"
echo "   systemctl status xcloud"
echo "   pm2 list"
echo ""
echo "🌐 Приложение доступно по адресу:"
echo "   https://cloud.l0.mom"
echo ""
echo "📋 Логи:"
echo "   sudo journalctl -u xcloud -f"
echo "   pm2 logs xcloud-storage"
