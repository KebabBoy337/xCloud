#!/bin/bash

# xCloud Storage - Update Script
# Обновление проекта с GitHub и перезапуск сервисов

echo "🔄 xCloud Storage - Update from GitHub"
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

# Проверка, что мы в правильной директории
if [ ! -f "package.json" ] || [ ! -f "server.js" ]; then
    print_error "Этот скрипт должен быть запущен в корневой директории xCloud проекта"
    exit 1
fi

# Проверка git
if ! command -v git &> /dev/null; then
    print_error "Git не установлен. Установите git: sudo apt install git"
    exit 1
fi

# Проверка статуса git
if [ ! -d ".git" ]; then
    print_error "Это не git репозиторий. Инициализируйте git или клонируйте репозиторий"
    exit 1
fi

# Сохранение текущих изменений
print_status "Сохранение текущих изменений..."
git stash push -m "Auto-save before update $(date)"

# Получение обновлений с GitHub
print_status "Получение обновлений с GitHub..."
git fetch origin

# Проверка наличия обновлений
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    print_status "Уже последняя версия. Обновлений нет."
    exit 0
fi

print_status "Найдены обновления. Начинаем обновление..."

# Остановка сервисов
print_status "Остановка сервисов..."
sudo systemctl stop xcloud 2>/dev/null || true
sudo -u xcloud pm2 stop xcloud-storage 2>/dev/null || true

# Принудительное обновление кода (перезаписывает локальные изменения)
print_status "Обновление кода с GitHub..."
git reset --hard origin/main

# Восстановление prod.env если он был удален
print_status "Восстановление prod.env..."
if [ ! -f "prod.env" ]; then
    if [ -f "example.env" ]; then
        cp example.env prod.env
        print_status "prod.env восстановлен из example.env"
    else
        print_warning "example.env не найден, создайте prod.env вручную"
    fi
fi

# Установка зависимостей
print_status "Установка зависимостей..."
npm install --production

# Проверка конфигурации
print_status "Проверка конфигурации..."
if [ ! -f "config.js" ]; then
    print_error "Файл config.js не найден!"
    exit 1
fi

# Перезапуск сервисов
print_status "Перезапуск сервисов..."
sudo systemctl start xcloud

# Проверка статуса
print_status "Проверка статуса сервисов..."
sleep 3

if sudo systemctl is-active --quiet xcloud; then
    print_status "✅ Сервис xcloud запущен успешно"
else
    print_error "❌ Сервис xcloud не запустился"
    print_status "Проверьте логи: sudo journalctl -u xcloud -f"
    exit 1
fi

# Проверка PM2
if sudo -u xcloud pm2 list | grep -q "xcloud-storage.*online"; then
    print_status "✅ PM2 процесс запущен успешно"
else
    print_warning "⚠️  PM2 процесс не найден или не запущен"
    print_status "Попытка запуска PM2..."
    sudo -u xcloud pm2 start ecosystem.config.js
fi

# Проверка nginx
if sudo nginx -t > /dev/null 2>&1; then
    print_status "✅ Nginx конфигурация корректна"
    sudo systemctl reload nginx
else
    print_warning "⚠️  Проблемы с nginx конфигурацией"
    print_status "Проверьте: sudo nginx -t"
fi

# Финальная проверка
print_status "Финальная проверка..."
sleep 2

# Проверка доступности приложения
if curl -s http://localhost:3000/api/health > /dev/null; then
    print_status "✅ Приложение отвечает на запросы"
else
    print_warning "⚠️  Приложение не отвечает на localhost:3000"
fi

echo ""
echo "🎉 Обновление завершено!"
echo "========================="
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
echo ""
echo "🔄 Для следующего обновления просто запустите:"
echo "   sudo bash update.sh"
