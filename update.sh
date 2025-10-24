#!/bin/bash

# xCloud Storage - Universal Update Script
# Работает из любой папки, обновляет /opt/xcloud

set -e

echo "🔄 xCloud Storage - Universal Update"
echo "===================================="

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

# Определяем исходную директорию (где запущен скрипт)
SOURCE_DIR="$(pwd)"
print_status "Исходная директория: $SOURCE_DIR"

# Проверка, что в исходной директории есть файлы проекта
if [ ! -f "$SOURCE_DIR/package.json" ] || [ ! -f "$SOURCE_DIR/server.js" ]; then
    print_error "Файлы проекта не найдены в $SOURCE_DIR"
    print_error "Запустите скрипт из папки с проектом xCloud"
    exit 1
fi

# Проверка git в исходной директории
if [ ! -d "$SOURCE_DIR/.git" ]; then
    print_error "Git репозиторий не найден в $SOURCE_DIR"
    exit 1
fi

print_step "1. Проверка текущего статуса..."

# Проверка текущего статуса сервиса
if systemctl is-active --quiet xcloud; then
    print_status "Сервис xcloud запущен"
else
    print_warning "Сервис xcloud не запущен"
fi

# Переходим в исходную директорию для работы с git
cd "$SOURCE_DIR"

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
    print_status "Git уже последняя версия, но принудительно обновляем файлы..."
else
    print_status "Найдены обновления. Начинаем обновление..."
fi

# Остановка сервисов
print_step "4. Остановка сервисов..."
systemctl stop xcloud 2>/dev/null || print_warning "Сервис xcloud уже остановлен"

# Принудительное обновление кода (перезаписывает локальные изменения)
print_step "5. Обновление кода с GitHub..."
git reset --hard origin/main

# Очистка и копирование файлов в продакшн директорию
print_step "6. Очистка и копирование файлов в /opt/xcloud..."

# Сохраняем важные файлы из Important_files
if [ -f "/opt/xcloud/Important_files/prod.env" ]; then
    cp /opt/xcloud/Important_files/prod.env /tmp/prod.env.backup
    print_status "Сохранен prod.env из Important_files"
fi

if [ -f "/opt/xcloud/Important_files/.public_links.json" ]; then
    cp /opt/xcloud/Important_files/.public_links.json /tmp/public_links.json.backup
    print_status "Сохранен .public_links.json"
fi

# ВАЖНО: Папка /opt/xcloud/storage содержит файлы пользователей - НЕ УДАЛЯЕМ!
print_status "Защищаем папку storage с файлами пользователей"

# ВАЖНО: Папка /opt/xcloud/Important_files содержит настройки - НЕ УДАЛЯЕМ!
print_status "Защищаем папку Important_files с настройками"

# Очищаем директорию (кроме node_modules, storage, Important_files и prod.env)
print_status "Очистка /opt/xcloud..."
find /opt/xcloud -maxdepth 1 -type f -name "*.js" -delete
find /opt/xcloud -maxdepth 1 -type f -name "*.json" -delete
find /opt/xcloud -maxdepth 1 -type f -name "*.md" -delete
find /opt/xcloud -maxdepth 1 -type f -name "*.sh" -delete
find /opt/xcloud -maxdepth 1 -type f -name "example.env" -delete
rm -rf /opt/xcloud/public
# НЕ удаляем storage - там файлы пользователей!
# НЕ удаляем Important_files - там настройки!

# Копируем новые файлы, исключая storage и Important_files
print_status "Копирование файлов (исключая storage и Important_files)..."
rsync -av --exclude='storage' --exclude='Important_files' --exclude='node_modules' "$SOURCE_DIR"/ /opt/xcloud/

# Восстанавливаем важные файлы в Important_files
if [ -f "/tmp/prod.env.backup" ]; then
    cp /tmp/prod.env.backup /opt/xcloud/Important_files/prod.env
    rm /tmp/prod.env.backup
    print_status "Восстановлен prod.env в Important_files"
fi

if [ -f "/tmp/public_links.json.backup" ]; then
    cp /tmp/public_links.json.backup /opt/xcloud/Important_files/.public_links.json
    rm /tmp/public_links.json.backup
    print_status "Восстановлен .public_links.json"
fi

# Создаем симлинк на prod.env если его нет
if [ ! -f "/opt/xcloud/prod.env" ] && [ -f "/opt/xcloud/Important_files/prod.env" ]; then
    ln -s /opt/xcloud/Important_files/prod.env /opt/xcloud/prod.env
    print_status "Создан симлинк на prod.env"
fi

# Создаем папку storage если её нет
if [ ! -d "/opt/xcloud/storage" ]; then
    mkdir -p /opt/xcloud/storage
    print_status "Создана папка storage"
else
    # Проверяем, есть ли файлы в storage
    file_count=$(find /opt/xcloud/storage -type f | wc -l)
    if [ "$file_count" -gt 0 ]; then
        print_status "Найдено $file_count файлов в storage - защищены от удаления"
    else
        print_status "Папка storage пуста"
    fi
fi

# Создаем папку Important_files если её нет
if [ ! -d "/opt/xcloud/Important_files" ]; then
    mkdir -p /opt/xcloud/Important_files
    print_status "Создана папка Important_files"
else
    # Проверяем, есть ли файлы в Important_files
    file_count=$(find /opt/xcloud/Important_files -type f | wc -l)
    if [ "$file_count" -gt 0 ]; then
        print_status "Найдено $file_count файлов в Important_files - защищены от удаления"
    else
        print_status "Папка Important_files пуста"
    fi
fi

# Сразу исправляем права доступа
chown -R xcloud:xcloud /opt/xcloud
chmod -R 755 /opt/xcloud

print_status "Файлы обновлены в /opt/xcloud"

# Проверка конфигурации
print_step "7. Проверка конфигурации..."
cd /opt/xcloud
if [ ! -f "prod.env" ]; then
    print_error "prod.env не найден! Создайте его вручную из example.env"
    print_status "cp example.env prod.env"
    print_status "nano prod.env"
    exit 1
else
    print_status "prod.env найден, сохраняем существующие настройки"
fi

# Установка зависимостей
print_step "8. Установка зависимостей..."
# Сначала исправляем права на все файлы
chown -R xcloud:xcloud /opt/xcloud
chmod -R 755 /opt/xcloud
# Затем устанавливаем зависимости от имени пользователя xcloud
sudo -u xcloud npm install --production

# Проверка конфигурации
if [ ! -f "config.js" ]; then
    print_error "Файл config.js не найден!"
    exit 1
fi

# Права доступа уже исправлены на шаге 6
print_step "9. Проверка прав доступа..."
print_status "Права доступа уже исправлены"

# Перезапуск сервисов
print_step "10. Перезапуск сервисов..."
systemctl start xcloud

# Ожидание запуска
print_step "11. Ожидание запуска сервиса..."
sleep 5

# Проверка статуса
print_step "12. Проверка статуса сервисов..."

if systemctl is-active --quiet xcloud; then
    print_status "✅ Сервис xcloud запущен успешно"
else
    print_error "❌ Сервис xcloud не запустился"
    print_status "Проверьте логи: journalctl -u xcloud -f"
    exit 1
fi

# Проверка nginx
print_step "13. Проверка Nginx..."
if nginx -t > /dev/null 2>&1; then
    print_status "✅ Nginx конфигурация корректна"
    systemctl reload nginx
else
    print_warning "⚠️  Проблемы с nginx конфигурацией"
    print_status "Проверьте: nginx -t"
fi

# Финальная проверка
print_step "14. Финальная проверка..."
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
