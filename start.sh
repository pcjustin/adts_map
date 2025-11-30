#!/bin/bash

echo "🌊 淨水場水質監測地圖"
echo "================================"
echo ""

# 檢查 Node.js 是否安裝
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安裝。請先安裝 Node.js"
    exit 1
fi

echo "✅ Node.js 已安裝: $(node -v)"
echo ""

# 檢查 npm 是否安裝
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安裝。請先安裝 npm"
    exit 1
fi

echo "✅ npm 已安裝: $(npm -v)"
echo ""

# 安裝依賴（如果未安裝）
if [ ! -d "node_modules" ]; then
    echo "📦 正在安裝依賴..."
    npm install
    echo "✅ 依賴安裝完成"
    echo ""
fi

# 啟動伺服器
echo "🚀 啟動伺服器..."
echo ""
echo "📍 訪問地址: http://localhost:3000"
echo "❌ 按 Ctrl+C 停止服務器"
echo ""

npm start
