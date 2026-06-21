#!/bin/bash

echo "🚀 启动故事脑项目..."

# 检查是否安装了Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到Node.js，请先安装Node.js"
    exit 1
fi

echo "✅ Node.js版本: $(node -v)"

# 安装后端依赖
echo "📦 安装后端依赖..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
fi

# 安装前端依赖
echo "📦 安装前端依赖..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    npm install
fi

cd ..

echo ""
echo "✅ 依赖安装完成！"
echo ""
echo "📝 启动说明："
echo "1. 打开第一个终端，运行后端服务："
echo "   cd backend && npm run dev"
echo ""
echo "2. 打开第二个终端，运行前端服务："
echo "   cd frontend && npm run dev"
echo ""
echo "3. 在浏览器中访问: http://localhost:3000"
echo ""
echo "🎉 准备就绪！"
