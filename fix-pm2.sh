#!/bin/bash

# xCloud Storage - Fix PM2 Issues
# Исправление проблем с PM2

echo "🔧 Исправление проблем с PM2..."

# Остановка всех сервисов
echo "🛑 Остановка сервисов..."
sudo systemctl stop xcloud 2>/dev/null || true

# Убиваем все процессы
echo "🔫 Завершение процессов..."
sudo pkill -f "node.*server.js" 2>/dev/null || true
sudo pkill -f "pm2" 2>/dev/null || true
sudo pkill -f "xcloud" 2>/dev/null || true

# Полная очистка PM2
echo "🧹 Полная очистка PM2..."
sudo rm -rf /home/xcloud/.pm2
sudo rm -rf /tmp/.pm2*
sudo rm -rf /var/log/pm2*

# Создание директории PM2 заново
echo "📁 Создание директории PM2..."
sudo mkdir -p /home/xcloud/.pm2
sudo chown -R xcloud:xcloud /home/xcloud/.pm2
sudo chmod -R 755 /home/xcloud/.pm2

# Ожидание
echo "⏳ Ожидание..."
sleep 3

# Запуск только systemd (без PM2)
echo "🚀 Запуск systemd сервиса..."
sudo systemctl start xcloud

# Проверка
echo "📊 Проверка статуса..."
sleep 5
sudo systemctl status xcloud --no-pager

echo ""
echo "✅ PM2 исправлен!"
echo "🌐 Приложение: https://cloud.l0.mom"
echo ""
echo "📋 Логи: sudo journalctl -u xcloud -f"
