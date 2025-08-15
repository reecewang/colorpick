FROM nginx:alpine

# 复制构建产物到 nginx 默认目录
COPY dist /usr/share/nginx/html

# 暴露 80 端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]

