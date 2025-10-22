#!/bin/bash

# xCloud Storage - Simple Restart
# Простой перезапуск systemd сервиса

echo "🔄 Перезапуск xCloud Storage..."

# Остановка сервиса
echo "🛑 Остановка сервиса..."
sudo systemctl stop xcloud

# Ожидание
sleep 2

# Запуск сервиса
echo "🚀 Запуск сервиса..."
sudo systemctl start xcloud

# Проверка статуса
echo "📊 Проверка статуса..."
sleep 3
sudo systemctl status xcloud --no-pager

echo ""
echo "✅ Перезапуск завершен!"
echo "🌐 Приложение: https://cloud.l0.mom"
echo "📋 Логи: sudo journalctl -u xcloud -f"
