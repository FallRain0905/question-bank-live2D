# 题库系统 - 学习共享平台

> 一个支持题目和笔记上传、分享、讨论的在线学习社区

[![Next.js](https://img.shields.io/badge/Next.js-15.1.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3E88C6?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![React](https://img.shields.io/badge/React-19.0.0-black?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-black?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

## 📖 项目介绍

这是一个面向学习者的在线题库与笔记共享平台，用户可以：
- 上传和分享题目与学习笔记
- 浏览和搜索题库内容
- 通过标签分类管理学习资源
- 参与社区互动（评论、关注、收藏）
- 创建和加入班级进行协作学习
- 自定义网站配色主题
- 🤖 **AI学习助手**：集成智能AI助手，支持对话记忆和多模型配置
- 🎭 **Live2D角色**：可定制的虚拟角色，增强学习体验

## ✨ 主要功能

### 🤖 AI学习助手
- **智能对话**：基于千问大模型的智能对话系统
- **对话记忆**：每个用户独立的对话历史，支持多会话管理
- **个性化配置**：可自定义AI助手名称、性格、回复风格等
- **多模型支持**：支持千问系列模型，可添加自定义模型
- **多模态输入**：支持文本对话、屏幕截图、图片上传
- **LaTeX公式支持**：自动渲染数学公式
- **实时响应**：流畅的对话体验和状态管理

### 🎭 Live2D角色
- **动态角色**：集成Live2D虚拟角色展示
- **自定义设置**：可调整角色显示大小、位置和样式
- **点击穿透**：支持角色背景透明，不影响页面交互
- **模型管理**：支持多种Live2D模型切换

### 📚 题库功能
- 题目上传：支持文本、图片、PDF/Word 文档上传
- 智能解析：自动解析题目中的数学公式（使用 KaTeX）
- 标签管理：自定义标签分类题目
- 收藏功能：收藏喜欢的题目
- 评论互动：发表评论和回复讨论

### 📝 笔记功能
- 笔记上传：支持多种格式文档
- 文件预览：在线预览多种文件类型
- 点赞互动：喜欢作者的笔记
- 收藏管理：分类收藏学习资料

### 💬 社区互动
- 评论系统：支持主评论和回复嵌套
- 关注作者：关注感兴趣的内容创作者
- 消息通知：实时接收互动通知
- 社交动态：发现热门内容和活跃用户

### 🎓 班级协作
- 创建班级：创建学习班级并管理成员
- 班级审核：管理员审核班级创建申请
- 成员管理：添加、移除班级成员
- 班级专属：班级内专属的学习资源

### 🎨 界面特性
- 🎨 多彩主题：6 种精选配色方案可切换
  - 深蓝商务
  - 紫罗兰
  - 清新薄荷
  - 暖橙夕照
  - 梦幻天空
  - 春日花园
- 📱 响应式设计：完美适配桌面端和移动端
- ✨ 流畅动画：使用 Framer Motion 实现优雅动效
- 🌙 深色模式：自动适配系统主题

## 🛠 技术栈

### 前端
| 技术 | 版本 | 说明 |
|------|------|------|
| Next.js | 15.1.3 | React 全栈框架 |
| React | 19.0.0 | UI 库 |
| TypeScript | 5.0 | 类型安全 |
| Tailwind CSS | 3.4.1 | 原子框架 |
| Framer Motion | 12.34.3 | 动画库 |
| date-fns | 4.1.0 | 日期处理 |
| KaTeX | 0.16.28 | 数学公式渲染 |
| Mammoth | 1.11.0 | Word 文档解析 |
| PIXI.js | 7.4.3 | 2D渲染引擎（Live2D） |
| Live2D Cubism | 4.0 | 动态角色引擎 |
| 千问 API | - | AI对话服务 |

### 后端/数据库
| 技术 | 版本 | 说明 |
|------|------|------|
| Supabase | - | BaaS 服务提供商 |
| PostgreSQL | - | 关系型数据库 |

### 样式工具
- PostCSS：CSS 转换工具
- Autoprefixer：自动添加浏览器前缀

## 📁 项目结构

```
question-bank/
├── app/                    # Next.js 应用页面
│   ├── admin/            # 管理员页面
│   │   ├── classes/    # 班级审核
│   │   ├── tags/       # 标签管理
│   │   └── announcements/ # 公告管理
│   ├── classes/          # 班级管理
│   ├── login/           # 登录/注册
│   ├── me/              # 个人中心
│   ├── notes/           # 笔记相关
│   ├── notifications/    # 消息通知
│   ├── parse/           # 文档转换工具
│   ├── questions/        # 题库详情
│   ├── search/          # 搜索页
│   ├── social/          # 社区动态
│   ├── upload/          # 资源上传
│   └── users/           # 用户主页
├── components/           # 可复用组件
│   ├── Navbar.tsx      # 导航栏（含主题切换）
│   ├── Footer.tsx      # 页脚
│   ├── UserAvatar.tsx  # 用户头像组件
│   ├── FloatingAIButton.tsx  # AI助手悬浮按钮和对话面板
│   ├── Live2DCharacter.tsx  # Live2D角色展示
│   └── ...
├── lib/                 # 工具函数
│   ├── supabase.ts      # Supabase 客户端封装
│   ├── ai-service.ts   # AI对话服务
│   ├── ai-parser.ts    # AI响应解析工具
│   ├── ai-memory-service.ts  # AI对话记忆服务
│   ├── llm-config-service.ts  # LLM配置管理
│   ├── theme.ts         # 主题配置系统
│   ├── upload.ts        # 文件上传处理
│   └── ...
├── supabase/           # 数据库 SQL 脚本
│   ├── schema.sql       # 基础表结构
│   ├── notes_schema.sql # 笔记表定义
│   ├── class_system.sql # 班级系统表
│   └── ...
├── public/              # 静态资源
├── types/               # TypeScript 类型定义
└── 配置文件...
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18.x
- npm 或 yarn 或 pnpm

### 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

### 配置环境变量

在项目根目录创建 `.env.local` 文件：

```env
NEXT_PUBLIC_SUPABASE_URL=你的_Supabase_Project_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_Supabase_Anon_Key
QWEN_API_KEY=你的千问API_Key
```

**AI助手配置说明**：
- `QWEN_API_KEY` - 千问API密钥（可选，也可在应用内配置）
- 用户登录后可在AI助手设置中自行配置API Key
- 支持千问、自定义等多种模型配置

### 运行开发服务器

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000)

### 构建生产版本

```bash
npm run build
npm start
```

## 📊 数据库配置

### 执行 SQL 脚本

在 [Supabase Dashboard](https://supabase.com/dashboard) 的 SQL Editor 中按顺序执行以下脚本：

1. `schema.sql` - 基础表结构
2. `notes_schema.sql` - 笔记相关表
3. `class_system.sql` - 班级系统表
4. `ultimate_fix.sql` - 完整的 RLS 策略配置（整合所有修复）
5. `ai_conversation_memory.sql` - AI对话记忆系统表（可选）

### 核心表说明

| 表名 | 说明 |
|-------|------|
| `auth.users` | 用户认证表 |
| `user_profiles` | 用户公开信息 |
| `questions` | 题库 |
| `notes` | 笔记 |
| `comments` | 评论 |
| `likes` | 点赞 |
| `favorites` | 收藏 |
| `follows` | 关注 |
| `tags` | 标签 |
| `classes` | 班级 |
| `class_members` | 班级成员 |
| `class_approval_requests` | 班级审核申请 |
| `notifications` | 消息通知 |
| `ai_conversations` | AI对话会话 |
| `ai_messages` | AI对话消息 |
| `user_ai_settings` | 用户AI配置 |

## 🎨 主题系统

项目内置 6 种精心设计的配色方案，可通过导航栏的调色板图标随时切换：

| ID | 名称 | 主色调 | 适用场景 |
|----|------|--------|----------|
| a | 深蓝商务 | 蓝色系 | 商务专业 |
| b | 紫罗兰 | 紫粉色系 | 温柔浪漫 |
| c | 清新薄荷 | 靛绿色系 | 清新活力 |
| d | 暖橙夕照 | 橙粉色系 | 温暖亲和 |
| e | 梦幻天空 | 蓝天色系 | 轻盈明亮 |
| f | 春日花园 | 粉黄绿色系 | 自然和谐 |

主题设置会自动保存到浏览器本地存储，刷新页面后保持选中状态。

## 👥 权限系统

### RLS 策略
项目采用 Supabase Row Level Security (RLS) 实现数据安全隔离：

- **已认证用户**：可查看公开内容
- **内容所有者**：可编辑/删除自己的内容
- **超级管理员**：拥有全部管理权限

### 超级管理员邮箱
在 `supabase/ultimate_fix.sql` 中配置：

```sql
admin_emails TEXT[] := ARRAY['3283254551@qq.com'];
```

修改此数组可添加更多管理员邮箱。

## 📝 开发说明

### 代码规范
- 使用 TypeScript 进行类型检查
- 遵循 ESLint 规则
- 组件采用函数式声明

### 提交规范
```bash
git add .
git commit -m "描述变更"
```

### 分支策略
- `main` - 主分支，生产环境
- `dev` - 开发分支

## 🐛 常见问题

### Supabase 连接失败
检查 `.env.local` 文件中的 URL 和 Key 是否正确配置。

### RLS 策略报错
确保按顺序执行所有 SQL 脚本，特别是 `ultimate_fix.sql`。

### 主题切换不生效
清除浏览器缓存后刷新页面。

### AI助手无法使用
- 检查是否已登录
- 在AI设置中配置API Key（千问API Key或自定义模型）
- 确保网络连接正常

### 对话历史不显示
- 执行 `ai_conversation_memory.sql` 脚本创建对话表
- 检查数据库权限配置

### Live2D角色不显示
- 检查Live2D设置是否启用显示
- 确保浏览器支持WebGL
- 查看控制台是否有错误信息

## 📄 许可证

本项目采用 MIT 许可证，详见 [LICENSE](LICENSE) 文件。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 维护者

由 Claude 协助开发和维护

---

**祝你学习愉快！** 📚✨
