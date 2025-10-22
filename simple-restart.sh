#!/bin/bash

# xCloud Storage - Simple Restart
# Простой перезапуск через systemd без PM2

echo "🔄 Простой перезапуск xCloud Storage..."

# Остановка systemd сервиса
echo "🛑 Остановка systemd сервиса..."
sudo systemctl stop xcloud

# Убиваем все процессы Node.js
echo "🔫 Завершение всех процессов Node.js..."
sudo pkill -f "node.*server.js" 2>/dev/null || true
sudo pkill -f "xcloud" 2>/dev/null || true

# Ожидание
echo "⏳ Ожидание остановки..."
sleep 3

# Проверка что prod.env существует
if [ ! -f "prod.env" ]; then
    echo "❌ prod.env не найден! Создайте его:"
    echo "   cp example.env prod.env"
    echo "   nano prod.env"
    exit 1
fi

# Показываем текущие ключи
echo "🔑 Текущие API ключи:"
echo "MAIN_API_KEY: $(grep MAIN_API_KEY prod.env | cut -d'=' -f2)"
echo "UPLOAD_API_KEY: $(grep UPLOAD_API_KEY prod.env | cut -d'=' -f2)"

# Запуск systemd сервиса
echo "🚀 Запуск systemd сервиса..."
sudo systemctl start xcloud

# Ожидание запуска
echo "⏳ Ожидание запуска..."
sleep 5

# Проверка статуса
echo "📊 Проверка статуса..."
sudo systemctl status xcloud --no-pager

# Проверка доступности
echo "🌐 Проверка доступности..."
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Приложение отвечает на запросы"
else
    echo "⚠️  Приложение не отвечает на localhost:3000"
fi

echo ""
echo "🎉 Перезапуск завершен!"
echo "🌐 Приложение: https://cloud.l0.mom"
echo ""
echo "📋 Логи: sudo journalctl -u xcloud -f"
