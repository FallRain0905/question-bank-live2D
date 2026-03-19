# Question Bank 环境变量配置指南

## 必需的环境变量

在服务器上创建或编辑 `/root/question-bank/.env.local` 文件：

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://uuyjvdqtvfozwlsqvayp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1eWp2ZHF0dmZvendscXZheXlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMzc1MDAsImV4cCI6MjA4MzcxMzUwMH0.j2nxa8pNcBvuOSBu7fYoxz5ydZFJ9pmC9oqn_IvZB78

# 千问 AI 配置（必需！）
QWEN_API_KEY=sk-7655369fb29745bd86430da2a0ec0312

# Nextcloud 配置（可选，用于背景图片上传）
NEXTCLOUD_URL=http://82.156.44.197:8084
NEXTCLOUD_USER=admin
NEXTCLOUD_PASSWORD=z7OCvZ089VNvNodaZApCAvvzB8N6kV6iBKarNo1V4gx1NeEGa3uHJUHwTlmBvJWfTxpFls07
NEXTCLOUD_PUBLIC_URL=http://82.156.44.197:8084
```

## 在服务器上执行

```bash
cd /root/question-bank

# 创建/更新 .env.local 文件
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://uuyjvdqtvfozwlsqvayp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1eWp2ZHF0dmZvendscXZheXlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMzc1MDAsImV4cCI6MjA4MzcxMzUwMH0.j2nxa8pNcBvuOSBu7fYoxz5ydZFJ9pmC9oqn_IvZB78

QWEN_API_KEY=sk-7655369fb29745bd86430da2a0ec0312

NEXTCLOUD_URL=http://82.156.44.197:8084
NEXTCLOUD_USER=admin
NEXTCLOUD_PASSWORD=z7OCvZ089VNvNodaZApCAvvzB8N6kV6iBKarNo1V4gx1NeEGa3uHJUHwTlmBvJWfTxpFls07
NEXTCLOUD_PUBLIC_URL=http://82.156.44.197:8084
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
