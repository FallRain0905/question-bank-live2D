# 学习共享系统 - 更新说明

## 新增功能

### 1. 支持多种文件类型上传
- 图片：JPG、JPEG、PNG、GIF、WebP
- 文档：PDF、DOC、DOCX、PPT、PPTX、XLS、XLSX、TXT
- 压缩包：ZIP、RAR
- 文件大小限制：50MB

### 2. 笔记共享功能
- 用户可以上传学习笔记
- 支持标题、描述、文件、标签
- 其他用户可以浏览、下载、点赞笔记
- 笔记需要管理员审核后才会显示

### 3. "我的"页面
- 查看自己上传的所有题目
- 查看自己上传的所有笔记
- 显示审核状态（待审核/已通过/已拒绝）
- 可以删除自己上传的内容
- 查看笔记获得的点赞数

---

## 部署步骤

### 1. 更新数据库结构

在 Supabase SQL Editor 中运行 `supabase/notes_schema.sql` 文件。

### 2. 上传文件到服务器

```bash
scp -r "c:\Users\19855\Desktop\git\question-bank" root@82.157.206.151:/var/www/
```

### 3. 在服务器上重新部署

```bash
ssh root@82.157.206.151
cd /var/www/question-bank
rm -rf node_modules package-lock.json .next
npm install
npm run build
pm2 restart question-bank
```

---

## 页面路径

| 路径 | 说明 | 权限 |
|------|------|------|
| `/` | 首页 | 公开 |
| `/login` | 登录/注册 | 公开 |
| `/search` | 搜索题库 | 登录用户 |
| `/upload` | 上传题目 | 登录用户 |
| `/notes` | 浏览笔记 | 登录用户 |
| `/notes/upload` | 上传笔记 | 登录用户 |
| `/me` | 我的内容 | 登录用户 |
| `/admin` | 审核管理 | 管理员 |

---

## 数据库表结构

### notes（笔记表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID |
| title | TEXT | 标题 |
| description | TEXT | 描述 |
| file_url | TEXT | 文件URL |
| file_name | TEXT | 文件名 |
| file_type | TEXT | 文件类型 |
| file_size | BIGINT | 文件大小 |
| status | TEXT | 状态：pending/approved/rejected |
| likes_count | INTEGER | 点赞数 |
| created_at | TIMESTAMPTZ | 创建时间 |

### likes（点赞表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID |
| note_id | UUID | 笔记ID |
| created_at | TIMESTAMPTZ | 创建时间 |

---

## 使用说明

### 普通用户
1. 上传题目和笔记（需要登录）
2. 浏览题库和笔记（已审核的内容）
3. 点赞喜欢的笔记
4. 在"我的"页面管理自己的内容

### 管理员
1. 在"审核"页面查看待审核的题目和笔记
2. 可以通过、拒绝、删除任何内容
3. 在"我的"页面也可以管理自己的内容
