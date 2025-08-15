#!/bin/bash

echo "🎨 图像取色器部署脚本"
echo "========================"

# 检查是否已构建
if [ ! -d "dist" ]; then
    echo "⚠️  检测到dist目录不存在，正在构建项目..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ 构建失败！请检查错误信息"
        exit 1
    fi
    echo "✅ 构建完成！"
fi

echo ""
echo "请选择部署方式："
echo "1) GitHub Pages (免费，推荐)"
echo "2) Netlify (免费，功能强大)"
echo "3) Vercel (免费，性能优秀)"
echo "4) 本地服务器 (Python)"
echo "5) 本地服务器 (Node.js)"
echo "6) Docker部署"
echo "7) 仅查看dist目录内容"
echo ""

read -p "请输入选择 (1-7): " choice

case $choice in
    1)
        echo "🚀 部署到 GitHub Pages"
        echo "请按照以下步骤操作："
        echo ""
        echo "1. 在GitHub上创建新仓库"
        echo "2. 将代码推送到仓库："
        echo "   git init"
        echo "   git add ."
        echo "   git commit -m 'Initial commit'"
        echo "   git remote add origin https://github.com/你的用户名/仓库名.git"
        echo "   git push -u origin main"
        echo ""
        echo "3. 在仓库设置中启用GitHub Pages："
        echo "   - 进入 Settings > Pages"
        echo "   - Source 选择 'Deploy from a branch'"
        echo "   - Branch 选择 'main' 或 'master'"
        echo "   - Folder 选择 '/ (root)'"
        echo ""
        echo "4. 等待几分钟，您的应用将在以下地址可用："
        echo "   https://你的用户名.github.io/仓库名/"
        echo ""
        echo "💡 提示：如果使用main分支，可能需要选择main分支作为源"
        ;;
    2)
        echo "🚀 部署到 Netlify"
        echo "请按照以下步骤操作："
        echo ""
        echo "1. 访问 https://netlify.com 并注册/登录"
        echo "2. 点击 'New site from Git'"
        echo "3. 连接您的GitHub/GitLab/Bitbucket账户"
        echo "4. 选择包含此项目的仓库"
        echo "5. 构建设置："
        echo "   - Build command: npm run build"
        echo "   - Publish directory: dist"
        echo "6. 点击 'Deploy site'"
        echo ""
        echo "✅ 部署完成后，您将获得一个随机的.netlify.app域名"
        echo "💡 可以在设置中自定义域名"
        ;;
    3)
        echo "🚀 部署到 Vercel"
        echo "请按照以下步骤操作："
        echo ""
        echo "1. 访问 https://vercel.com 并注册/登录"
        echo "2. 点击 'New Project'"
        echo "3. 导入您的GitHub/GitLab/Bitbucket仓库"
        echo "4. 项目设置会自动检测（已配置vercel.json）"
        echo "5. 点击 'Deploy'"
        echo ""
        echo "✅ 部署完成后，您将获得一个随机的.vercel.app域名"
        echo "💡 可以在设置中自定义域名"
        ;;
    4)
        echo "🐍 启动本地Python服务器"
        echo "服务器将在 http://localhost:8000 启动"
        echo "按 Ctrl+C 停止服务器"
        echo ""
        cd dist
        python3 -m http.server 8000
        ;;
    5)
        echo "🟢 启动本地Node.js服务器"
        echo "服务器将在 http://localhost:3000 启动"
        echo "按 Ctrl+C 停止服务器"
        echo ""
        cd dist
        npx serve -s . -l 3000
        ;;
    6)
        echo "🐳 使用Docker部署"
        echo "正在构建Docker镜像..."
        docker build -t colorpick .
        if [ $? -eq 0 ]; then
            echo "✅ Docker镜像构建成功！"
            echo "运行容器："
            echo "docker run -p 3000:80 colorpick"
            echo "应用将在 http://localhost:3000 可用"
        else
            echo "❌ Docker构建失败"
        fi
        ;;
    7)
        echo "📁 dist目录内容："
        ls -la dist/
        echo ""
        echo "📄 主要文件："
        echo "- index.html: 主页面"
        echo "- assets/: 静态资源目录"
        echo ""
        echo "💡 您可以将整个dist目录上传到任何静态文件服务器"
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "🎉 部署完成！如有问题，请检查上述步骤。"
