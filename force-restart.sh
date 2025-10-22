#!/bin/bash

# xCloud Storage - Force Restart
# Принудительный перезапуск с очисткой кэша

echo "🔄 Принудительный перезапуск xCloud Storage..."

# Остановка всех сервисов
echo "🛑 Остановка сервисов..."
sudo systemctl stop xcloud
sudo -u xcloud pm2 kill

# Убиваем все процессы
echo "🔫 Завершение процессов..."
sudo pkill -f "node.*server.js"
sudo pkill -f "xcloud"

# Очистка кэша
echo "🧹 Очистка кэша..."
sudo rm -rf /tmp/.pm2*
sudo rm -rf /home/xcloud/.pm2/logs/*

# Ожидание
echo "⏳ Ожидание..."
sleep 3

# Запуск
echo "🚀 Запуск сервисов..."
sudo systemctl start xcloud

# Проверка
echo "📊 Проверка статуса..."
sleep 3
sudo systemctl status xcloud --no-pager

echo "✅ Перезапуск завершен!"
echo "🌐 Приложение: https://cloud.l0.mom"
