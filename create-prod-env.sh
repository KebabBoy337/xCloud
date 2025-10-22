#!/bin/bash

# xCloud Storage - Create prod.env Script
# Создание prod.env файла на продакшн сервере

echo "📝 xCloud Storage - Creating prod.env"
echo "====================================="

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
if [ ! -f "example.env" ]; then
    print_error "example.env не найден! Запустите скрипт из корневой директории проекта"
    exit 1
fi

# Создание prod.env
print_status "Создание prod.env из example.env..."
cp example.env prod.env

# Проверка создания
if [ -f "prod.env" ]; then
    print_status "✅ prod.env создан успешно"
else
    print_error "❌ Ошибка создания prod.env"
    exit 1
fi

# Показать содержимое
print_status "Содержимое prod.env:"
echo "========================"
cat prod.env
echo "========================"

print_warning "⚠️  ВАЖНО: Измените API ключи в prod.env!"
print_status "Редактирование: nano prod.env"
print_status "После изменения перезапустите сервис: sudo systemctl restart xcloud"

echo ""
echo "🔑 Текущие API ключи (ИЗМЕНИТЕ ИХ!):"
echo "   MAIN_API_KEY: main_key_2024_secure_12345"
echo "   UPLOAD_API_KEY: upload_key_2024_secure_67890"
echo ""
echo "📝 Для изменения ключей:"
echo "   nano prod.env"
echo "   sudo systemctl restart xcloud"
