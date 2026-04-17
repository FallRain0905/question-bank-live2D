# 管理员配置指南

## 概述

本指南说明如何在题库系统中配置管理员和审核员账户，以启用笔记和题目的审核功能。

## 管理员类型

### 1. 超级管理员（系统级）

超级管理员拥有最高权限，可以审核所有内容和管理系统设置。

**权限**：
- 审核所有题目和笔记
- 审核班级创建申请
- 访问系统配置页面
- 查看所有数据

**配置方法**：

#### 方法1：通过SQL直接配置（推荐）

在 Supabase SQL Editor 中执行：

```sql
-- 设置用户为超级管理员
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{is_admin}',
    'true'::jsonb
)
WHERE email = 'your_email@example.com';

-- 替换 'your_email@example.com' 为目标用户的邮箱
```

#### 方法2：通过 Supabase 控制台配置

1. 登录 Supabase 控制台
2. 进入 Authentication → Users
3. 找到要设置的用户
4. 点击编辑用户信息
5. 在 raw_user_meta_data 字段中添加：
   ```json
   {
     "is_admin": true
   }
   ```

#### 验证超级管理员配置：

```sql
-- 检查当前用户是否为超级管理员
SELECT
    id,
    email,
    raw_user_meta_data->>'is_admin' as is_admin
FROM auth.users
WHERE raw_user_meta_data->>'is_admin' = 'true';
```

### 2. 班级管理员/审核员（班级级）

班级管理员只能管理自己班级的内容。

**权限**：
- 审核本班级的题目和笔记
- 管理班级成员
- 查看本班级数据

**配置方法**：

#### 创建班级时自动成为管理员

当用户创建班级时，系统会自动将其设置为该班级的创建者（creator）。

#### 手动设置班级审核员

```sql
-- 将用户设置为班级审核员
INSERT INTO class_members (class_id, user_id, role, status)
VALUES (
    'class_uuid_here',  -- 班级ID
    'user_uuid_here',   -- 用户ID
    'moderator',        -- 角色
    'approved'          -- 状态
)
ON CONFLICT (class_id, user_id)
DO UPDATE SET role = 'moderator', status = 'approved';
```

#### 查看班级管理员：

```sql
-- 查看所有班级的管理员和审核员
SELECT
    c.name as class_name,
    cm.role,
    u.email as user_email,
    cm.status as member_status
FROM class_members cm
JOIN classes c ON cm.class_id = c.id
JOIN auth.users u ON cm.user_id = u.id
WHERE cm.role IN ('creator', 'moderator')
ORDER BY c.name, cm.role;
```

## 审核流程

### 笔记审核流程

1. **用户上传笔记**
   - 笔记状态：`pending`
   - 只有创建者和管理员/审核员可以看到

2. **管理员/审核员审核**
   - 访问 `/admin` 页面
   - 选择"笔记"标签页
   - 查看待审核笔记（状态筛选：待审核）
   - 点击"通过"或"拒绝"

3. **审核结果**
   - **通过**：笔记状态变为 `approved`，在笔记库中可见
   - **拒绝**：笔记状态变为 `rejected`，在笔记库中不可见

### 题目审核流程

与笔记审核流程相同，但在管理页面选择"题目"标签页。

### 班级审核流程（仅超级管理员）

1. **用户创建班级**
   - 班级状态：`pending`
   - 创建审核请求自动提交

2. **超级管理员审核**
   - 访问 `/admin/classes` 页面
   - 查看待审核班级申请
   - 点击"通过"或"拒绝"

3. **审核结果**
   - **通过**：班级状态变为 `approved`，可以正常使用
   - **拒绝**：班级状态变为 `rejected`，需要重新申请

## 常见问题

### Q1: 为什么上传的笔记不显示？

**A**: 这不是bug，是系统的正常设计行为：
- 新上传的笔记状态为 `pending`，需要审核通过后才能显示
- 只有笔记创建者和管理员/审核员可以看到待审核的笔记
- 审核通过后，所有符合权限的用户都可以看到笔记

### Q2: 如何快速审核所有待审核内容？

**A**: 访问 `/admin` 页面，可以批量查看和审核待审核的笔记和题目。

### Q3: 可以跳过审核流程吗？

**A**: 不推荐，但如果需要：
- 可以修改数据库直接将笔记状态改为 `approved`
- 可以修改前端代码取消审核机制（不推荐，会有安全风险）

### Q4: 如何批量审核？

**A**: 当前版本需要逐个审核。如需批量审核功能，可以使用SQL：

```sql
-- 批量通过所有待审核的笔记
UPDATE notes
SET status = 'approved'
WHERE status = 'pending';

-- 批量通过所有待审核的题目
UPDATE questions
SET status = 'approved'
WHERE status = 'pending';

-- 批量通过特定班级的待审核内容
UPDATE notes
SET status = 'approved'
WHERE status = 'pending' AND class_id = 'specific_class_uuid';
```

### Q5: 用户可以看到自己的待审核笔记吗？

**A**: 是的，笔记创建者可以看到自己所有的笔记，包括待审核的。其他用户只能看到已审核通过的笔记。

## 安全建议

1. **谨慎分配管理员权限**：只给可信用户分配管理员权限
2. **定期审核管理员列表**：移除不再需要管理员权限的用户
3. **监控审核日志**：关注管理员的审核操作
4. **使用强密码**：确保管理员账户使用强密码
5. **启用两步验证**：如果可能，为管理员账户启用两步验证

## 技术支持

如果在配置过程中遇到问题：

1. 检查数据库中是否存在 `class_members` 表的 `status` 列
2. 验证用户的 `user_metadata` 中是否正确设置了 `is_admin`
3. 查看浏览器控制台是否有错误信息
4. 检查 Supabase 的 RLS 策略是否正确配置

## 相关文档

- [数据库修复指南](../supabase/fix_class_members_status.sql)
- [系统架构文档](README.md)
- [用户使用手册](USER_GUIDE.md)