# Question Bank 环境变量配置指南

## 必需的环境变量

在服务器上创建或编辑 `.env.local` 文件：

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=你的_Supabase_Project_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_Supabase_Anon_Key

# 千问 AI 配置（必需！）
QWEN_API_KEY=你的_QWEN_API_KEY

# Nextcloud 配置（可选，用于背景图片上传）
NEXTCLOUD_URL=你的_Nextcloud_URL
NEXTCLOUD_USER=你的_用户名
NEXTCLOUD_PASSWORD=你的_密码
NEXTCLOUD_PUBLIC_URL=你的_公共URL
```

## 在服务器上执行

```bash
cd /path/to/question-bank

# 创建/更新 .env.local 文件
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=你的_Supabase_Project_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_Supabase_Anon_Key

QWEN_API_KEY=你的_QWEN_API_KEY

NEXTCLOUD_URL=你的_Nextcloud_URL
NEXTCLOUD_USER=你的_用户名
NEXTCLOUD_PASSWORD=你的_密码
NEXTCLOUD_PUBLIC_URL=你的_公共URL
EOF

# 重新构建并启动
npm run build
pm2 restart question-bank
```

## 验证

```bash
# 测试 AI 助手
curl -X POST http://localhost:3000/api/ai-assistant \
  -H "Content-Type: application/json" \
  -d '{"question": "你好"}'

# 测试上传 API
curl -X POST http://localhost:3000/api/upload-background
```
