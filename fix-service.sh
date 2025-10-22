#!/bin/bash

# xCloud Storage - Service Fix Script
# Исправление проблемного systemd сервиса

echo "🔧 Исправление xCloud Storage сервиса..."

# Остановка всех процессов
echo "🛑 Остановка всех процессов..."
sudo systemctl stop xcloud 2>/dev/null || true
sudo -u xcloud pm2 stop all 2>/dev/null || true
sudo -u xcloud pm2 delete all 2>/dev/null || true

# Сброс failed статуса
echo "🔄 Сброс failed статуса..."
sudo systemctl reset-failed xcloud 2>/dev/null || true

# Убиваем все процессы на порту 3000
echo "🔫 Освобождение порта 3000..."
sudo fuser -k 3000/tcp 2>/dev/null || true
sudo lsof -ti:3000 | xargs sudo kill -9 2>/dev/null || true

# Очистка PM2
echo "🧹 Очистка PM2..."
sudo -u xcloud pm2 kill 2>/dev/null || true

# Перезапуск сервиса
echo "🚀 Перезапуск сервиса..."
sudo systemctl daemon-reload
sudo systemctl start xcloud

# Проверка статуса
echo "📊 Статус сервиса:"
sudo systemctl status xcloud --no-pager

echo "📊 PM2 процессы:"
sudo -u xcloud pm2 list

echo "🌐 Проверка порта 3000:"
sudo lsof -i :3000 || echo "Порт 3000 свободен"

echo "✅ Исправление завершено!"
