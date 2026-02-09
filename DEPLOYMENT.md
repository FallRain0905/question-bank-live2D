# 腾讯云轻量级服务器部署指南

## 服务器环境准备

### 1. 连接到服务器
```bash
ssh root@你的服务器IP
```

### 2. 安装 Node.js (如果还没有)
```bash
# 安装 Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 验证安装
node -v
npm -v
```

### 3. 安装 PM2 (进程管理器)
```bash
npm install -g pm2
```

### 4. 安装 Nginx (如果需要反向代理)
```bash
apt update
apt install nginx -y
```

## 部署步骤

### 方式一：直接上传文件

#### 1. 在本地构建项目
```bash
# 在项目目录下
npm install
npm run build
```

#### 2. 上传文件到服务器
```bash
# 使用 scp 上传（在你的本地电脑执行）
scp -r /c/Users/19855/Desktop/git/question-bank root@你的服务器IP:/root/

# 或者使用 rsync
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' \
  /c/Users/19855/Desktop/git/question-bank/ root@你的服务器IP:/root/question-bank
```

#### 3. 在服务器上安装依赖并启动
```bash
# 连接到服务器后
cd /root/question-bank
npm install --production

# 设置环境变量
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=你的Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase Anon Key
EOF

# 使用 PM2 启动
pm2 start ecosystem.config.json

# 保存 PM2 配置
pm2 save
pm2 startup
```

### 方式二：使用 Git 部署

#### 1. 在服务器上克隆项目
```bash
# 安装 git
apt install git -y

# 克隆项目（将代码推送到 GitHub 后）
git clone https://github.com/你的用户名/question-bank.git
cd question-bank
```

#### 2. 安装依赖并构建
```bash
npm install
npm run build

# 设置环境变量
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=你的Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase Anon Key
EOF

# 启动
pm2 start ecosystem.config.json
pm2 save
pm2 startup
```

## 配置 Nginx 反向代理（可选但推荐）

```bash
# 创建 Nginx 配置文件
nano /etc/nginx/sites-available/question-bank
```

添加以下内容：
```nginx
server {
    listen 80;
    server_name 你的域名或服务器IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：
```bash
ln -s /etc/nginx/sites-available/question-bank /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

## 常用命令

### PM2 命令
```bash
pm2 list              # 查看所有进程
pm2 logs question-bank # 查看日志
pm2 restart question-bank  # 重启应用
pm2 stop question-bank      # 停止应用
pm2 delete question-bank    # 删除应用
pm2 monit                   # 监控
```

### 更新部署
```bash
cd /root/question-bank
git pull
npm install
npm run build
pm2 restart question-bank
```

## 防火墙配置

```bash
# 如果启用了 ufw
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
```

## 注意事项

1. **环境变量**：确保 `.env.local` 文件包含正确的 Supabase 配置
2. **Supabase 数据库**：确保已在 Supabase 执行了 SQL 脚本：
   - `supabase/class_system.sql`
   - `supabase/social_circle.sql`
3. **端口**：确保服务器防火墙允许 3000 端口（如果不用 Nginx）
4. **域名**：如果使用域名，记得在 DNS 设置 A 记录指向服务器 IP
