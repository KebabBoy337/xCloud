#!/bin/bash

# xCloud Storage - Update Script
# Обновление проекта с GitHub и перезапуск сервисов

set -e

echo "🔄 xCloud Storage - Update from GitHub"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Проверка root прав
if [ "$EUID" -ne 0 ]; then
    print_error "Запустите с sudo: sudo bash update.sh"
    exit 1
fi

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

print_step "1. Проверка текущего статуса..."

# Проверка текущего статуса сервиса
if systemctl is-active --quiet xcloud; then
    print_status "Сервис xcloud запущен"
else
    print_warning "Сервис xcloud не запущен"
fi

# Сохранение текущих изменений
print_step "2. Сохранение текущих изменений..."
git stash push -m "Auto-save before update $(date)" || print_warning "Нет изменений для сохранения"

# Получение обновлений с GitHub
print_step "3. Получение обновлений с GitHub..."
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
print_step "4. Остановка сервисов..."
systemctl stop xcloud 2>/dev/null || print_warning "Сервис xcloud уже остановлен"

# Принудительное обновление кода (перезаписывает локальные изменения)
print_step "5. Обновление кода с GitHub..."
git reset --hard origin/main

# Восстановление prod.env если он был удален
print_step "6. Проверка конфигурации..."
if [ ! -f "prod.env" ]; then
    if [ -f "example.env" ]; then
        cp example.env prod.env
        print_status "prod.env восстановлен из example.env"
        print_warning "⚠️  ВАЖНО: Измените API ключи в prod.env!"
    else
        print_error "example.env не найден, создайте prod.env вручную"
        exit 1
    fi
else
    print_status "prod.env найден, сохраняем существующие настройки"
fi

# Установка зависимостей
print_step "7. Установка зависимостей..."
npm install --production

# Проверка конфигурации
if [ ! -f "config.js" ]; then
    print_error "Файл config.js не найден!"
    exit 1
fi

# Проверка прав доступа
print_step "8. Исправление прав доступа..."
chown -R xcloud:xcloud /opt/xcloud
chmod -R 755 /opt/xcloud

# Перезапуск сервисов
print_step "9. Перезапуск сервисов..."
systemctl start xcloud

# Ожидание запуска
print_step "10. Ожидание запуска сервиса..."
sleep 5

# Проверка статуса
print_step "11. Проверка статуса сервисов..."

if systemctl is-active --quiet xcloud; then
    print_status "✅ Сервис xcloud запущен успешно"
else
    print_error "❌ Сервис xcloud не запустился"
    print_status "Проверьте логи: journalctl -u xcloud -f"
    exit 1
fi

# Проверка nginx
print_step "12. Проверка Nginx..."
if nginx -t > /dev/null 2>&1; then
    print_status "✅ Nginx конфигурация корректна"
    systemctl reload nginx
else
    print_warning "⚠️  Проблемы с nginx конфигурацией"
    print_status "Проверьте: nginx -t"
fi

# Финальная проверка
print_step "13. Финальная проверка..."
sleep 3

# Проверка доступности приложения
if curl -s http://localhost:3000/api/health > /dev/null; then
    print_status "✅ Приложение отвечает на запросы"
else
    print_warning "⚠️  Приложение не отвечает на localhost:3000"
    print_status "Проверьте логи: journalctl -u xcloud -f"
fi

# Проверка внешнего доступа
if curl -s https://cloud.l0.mom/api/health > /dev/null; then
    print_status "✅ Внешний доступ работает"
else
    print_warning "⚠️  Внешний доступ не работает"
fi

echo ""
echo "🎉 Обновление завершено!"
echo "========================="
echo ""
echo "📊 Статус сервисов:"
echo "   systemctl status xcloud"
echo ""
echo "🌐 Приложение доступно по адресу:"
echo "   https://cloud.l0.mom"
echo ""
echo "📋 Логи:"
echo "   journalctl -u xcloud -f"
echo ""
echo "🔄 Для следующего обновления просто запустите:"
echo "   sudo bash update.sh"
