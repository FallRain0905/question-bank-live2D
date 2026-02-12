# 题库系统

一个基于 Next.js 和 Supabase 构建的共享学习资料平台，支持题目和笔记的上传、分类与检索。

## 功能特点

- **题库管理** - 支持文本和图片上传题目，按标签分类
- **笔记系统** - 上传学习笔记，支持 PDF、Word、PPT 等格式
- **智能搜索** - 全文检索，快速定位所需内容
- **社区互动** - 学习圈交流、点赞收藏、关注作者
- **班级功能** - 创建或加入班级，班级管理员可审核内容
- **审核机制** - 内容需经审核后显示
- **公告系统** - 管理员可发布站内公告

## 技术栈

- **前端**: Next.js 15, React, TypeScript, Tailwind CSS
- **后端**: Supabase (认证、数据库、存储)
- **部署**: Vercel / 其他静态托管

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 初始化数据库

在 Supabase SQL Editor 中依次执行以下 SQL 文件：

```
supabase/schema.sql          -- 基础表结构
supabase/notes_schema.sql    -- 笔记表
supabase/class_system.sql    -- 班级系统
supabase/social_circle.sql    -- 学习圈
supabase/admin_features.sql   -- 管理员和公告
```

### 4. 运行开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 管理员配置

默认管理员邮箱: `3283254551@qq.com`

执行 `supabase/admin_features.sql` 后自动获得管理员权限。

## 部署

```bash
npm run build
npm start
```

## 许可证

MIT
