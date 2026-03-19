# Question Bank - PM2 启动指南

## 1. 构建（如果还没构建）
```bash
cd /root/projects/question-bank
npm run build
```

## 2. 启动服务
```bash
cd /root/projects/question-bank

# 方式 A：使用配置文件启动
pm2 start ecosystem.config.js

# 方式 B：直接启动
pm2 start npm --name "question-bank" -- start
```

## 3. 常用命令
```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs question-bank

# 重启
pm2 restart question-bank

# 停止
pm2 stop question-bank

# 删除
pm2 delete question-bank

# 保存当前进程列表（开机自启）
pm2 save

# 设置开机自启
pm2 startup
```

## 4. 监控
```bash
# 实时监控面板
pm2 monit

# 查看详细信息
pm2 show question-bank
```

## 5. 更新代码后重启
```bash
cd /root/projects/question-bank
git pull origin master
npm run build
pm2 restart question-bank
```
