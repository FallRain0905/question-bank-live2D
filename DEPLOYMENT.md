# 腾讯云服务器部署指南

本文档提供了在腾讯云服务器上部署题库系统的配置建议。

## 1. 环境变量配置

确保在服务器上设置了以下环境变量：

```bash
# 在 .env.local 或服务器环境变量中设置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 2. Nginx 配置

如果你的应用通过 Nginx 反向代理，确保以下配置正确：

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    # 支持 WebSocket (Supabase 实时功能需要)
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # 禁用缓冲，避免流式响应被延迟
    proxy_buffering off;
}
```

## 3. HTTPS 配置

Supabase Auth 依赖安全的 Cookie，**必须使用 HTTPS**：

1. 申请 SSL 证书（腾讯云免费 SSL 证书）
2. 配置 Nginx 强制 HTTPS 重定向：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 其他配置...
}
```

## 4. PM2 配置（可选）

如果使用 PM2 保持应用持续运行：

```javascript
module.exports = {
  apps: [{
    name: 'question-bank',
    script: 'npm',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    }
  }]
};
```

## 5. 构建和启动

```bash
# 安装依赖
npm install

# 构建生产版本
npm run build

# 使用 PM2 启动
pm2 start ecosystem.config.js

# 或直接使用 npm start (不推荐生产环境)
npm start
```

## 6. 常见问题排查

### 6.1 登录后页面一直加载

**症状**：登录成功后页面显示加载状态但不跳转

**可能原因**：
1. Nginx 缓冲设置不当
2. WebSocket 连接被阻断
3. 服务端渲染环境变量未正确传递

**解决方案**：
```bash
# 检查 Nginx 错误日志
tail -f /var/log/nginx/error.log

# 检查应用日志
pm2 logs question-bank
```

### 6.2 Supabase 连接失败

**症状**：控制台显示 "Supabase 配置缺失" 或连接错误

**解决方案**：
```bash
# 在服务器上测试环境变量
echo $NEXT_PUBLIC_SUPABASE_URL

# 检查防火墙是否阻止 Supabase 域名
curl -I https://your-project.supabase.co
```

### 6.3 CSP 警告

**症状**：控制台出现 CSP（内容安全策略）相关警告

**解决方案**：在 Nginx 配置中调整 CSP 头

```nginx
# 仅在必要时添加 CSP，或确保允许 Supabase 域
add_header Content-Security-Policy "default-src 'self' https://*.supabase.co; connect-src 'self' https://*.supabase.co;";
```

## 7. 数据库迁移

确保在 Supabase 后台执行了所有 SQL 文件：

1. `supabase/schema.sql` - 基础表结构
2. `supabase/notes_schema.sql` - 笔记表
3. `supabase/class_system.sql` - 班级系统
4. `supabase/social_circle.sql` - 学习圈
5. `supabase/admin_features.sql` - 管理员和公告

执行顺序很重要，先执行基础 schema，再执行功能扩展。
