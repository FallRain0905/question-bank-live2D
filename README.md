# Question Bank

一个基于 Next.js 和 Supabase 构建的在线题库与学习笔记分享平台。

## 功能特性

### 题目管理
- **多种格式支持**：支持文本、图片、PDF、DOCX 等多种格式的题目上传
- **文档解析**：自动解析 PDF 和 DOCX 文档内容
- **AI 辅助**：集成 AI 解析题目和生成答案
- **答案配对**：支持将题目与答案进行智能配对
- **标签分类**：通过标签对题目进行分类管理

### 学习笔记
- **笔记分享**：上传和分享学习笔记
- **图文混排**：支持图文结合的笔记内容
- **文档附件**：支持上传 PDF、DOCX 等文档附件
- **点赞收藏**：点赞和收藏喜欢的笔记

### 社交互动
- **用户关注**：关注其他用户，构建学习社区
- **评论回复**：对题目和笔记进行评论和回复
- **收藏功能**：收藏感兴趣的题目和笔记
- **通知系统**：实时接收关注、评论、点赞等通知

### 班级系统
- **班级创建**：创建学习班级，邀请同学加入
- **班级管理**：设置管理员，管理班级成员
- **班级内容**：班级内分享专属题目和笔记
- **邀请码**：通过邀请码快速加入班级

### 管理功能
- **内容审核**：管理员审核用户提交的题目和笔记
- **标签管理**：管理题目标签体系
- **公告发布**：发布平台公告
- **用户管理**：查看和管理用户信息

### 搜索功能
- **全文搜索**：搜索题目、笔记内容
- **标签筛选**：按标签筛选内容
- **搜索历史**：保存用户搜索记录

### 其他功能
- **LaTeX 公式渲染**：使用 KaTeX 渲染数学公式
- **文档预览下载**：支持文档在线预览和下载
- **响应式设计**：适配桌面和移动设备
- **用户资料**：自定义用户头像和昵称

## 技术栈

### 前端
- **Next.js 15.1.3**：React 框架，App Router
- **React 19**：用户界面库
- **TypeScript**：类型安全
- **Tailwind CSS**：样式框架

### 后端
- **Supabase**：后端即服务
  - PostgreSQL 数据库
  - 用户认证
  - 文件存储
  - 实时订阅

### 第三方库
- **KaTeX**：LaTeX 公式渲染
- **mammoth**：DOCX 文档解析
- **pdf-parse**：PDF 文档解析
- **date-fns**：日期处理
- **pdfjs-dist**：PDF 预览

## 快速开始

### 环境要求
- Node.js 18 或更高版本
- npm 或 yarn

### 安装依赖
```bash
npm install
```

### 配置环境变量
创建 `.env.local` 文件并配置以下内容：
```env
NEXT_PUBLIC_SUPABASE_URL=你的_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_supabase_anon_key
```

### 数据库初始化
在 Supabase SQL Editor 中按顺序执行以下 SQL 文件：

1. `supabase/schema.sql` - 基础表结构
2. `supabase/notes_schema.sql` - 笔记相关表
3. `supabase/class_system.sql` - 班级系统表
4. `supabase/social_circle.sql` - 社交功能表
5. `supabase/admin_features.sql` - 管理功能表
6. `supabase/new_features.sql` - 新功能（评论、收藏、通知等）
7. `supabase/add_question_files.sql` - 题目文档字段

### 本地开发
```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

### 生产构建
```bash
npm run build
npm start
```

## 项目结构

```
question-bank/
├── app/                    # Next.js App Router 页面
│   ├── admin/             # 管理后台
│   ├── api/               # API 路由
│   ├── classes/           # 班级管理
│   ├── login/             # 登录页面
│   ├── me/                # 个人中心
│   ├── notes/             # 笔记相关
│   ├── parse/             # 文档解析
│   ├── questions/         # 题目相关
│   ├── search/            # 搜索页面
│   ├── social/            # 社交圈
│   └── users/             # 用户页面
├── components/            # React 组件
│   └── Navbar.tsx         # 导航栏
├── lib/                   # 工具库
│   ├── document-parser.ts # 文档解析
│   ├── supabase.ts        # Supabase 客户端
│   ├── upload.ts          # 文件上传
│   └── utils.ts           # 工具函数
├── types/                 # TypeScript 类型定义
│   └── index.ts           # 数据库类型
├── supabase/              # 数据库脚本
│   ├── schema.sql         # 基础表结构
│   ├── notes_schema.sql   # 笔记表
│   ├── class_system.sql   # 班级表
│   ├── social_circle.sql   # 社交表
│   ├── admin_features.sql # 管理功能
│   ├── new_features.sql   # 新功能
│   └── add_question_files.sql # 文档字段
└── public/                # 静态资源
```

## 部署

### 部署到服务器
1. 克隆代码到服务器
```bash
git clone https://gitee.com/FallRain0905/question-bank.git
cd question-bank
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
```bash
cp .env.local.example .env.local
# 编辑 .env.local 填入 Supabase 配置
```

4. 构建项目
```bash
npm run build
```

5. 使用 PM2 运行
```bash
npm install -g pm2
pm2 start npm --name "question-bank" -- start
```

### 更新代码
```bash
# 在服务器上
cd /var/www/question-bank
git pull origin master
rm -rf .next
npm run build
pm2 restart question-bank
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
