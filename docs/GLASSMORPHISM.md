# 毛玻璃效果样式使用指南

本指南说明如何使用新添加的毛玻璃效果样式系统来美化题库应用。

## 快速开始

在任意组件或页面中使用以下类名即可启用毛玻璃效果：

```tsx
import '../styles/glassmorphism.css';

<div className="glass-card">
  {/* 内容 */}
</div>
<button className="glass-button glass-button-primary">
  按钮
</button>
```

---

## 核心类名

### 1. 卡片容器

| 类名 | 用途 | 效果 |
|-------|------|------|
| `glass-card` | 主内容卡片 | 半透明白色卡片 + 模糊 + 阴影 |
| `.glass-card.dark` | 深色模式卡片 | 更透明的背景 |

### 2. 按钮

| 类名 | 用途 | 效果 |
|-------|------|------|
| `glass-button` | 基础按钮样式 | 模糊 + 发光效果 |
| `glass-button:hover` | 悬停状态 | 上移动画 |
| `glass-button:active` | 点击状态 | 按下动画 |
| `glass-button-primary` | 主要操作按钮 | 蓝色渐变 |
| `glass-button-success` | 成功按钮 | 绿色渐变 |
| `glass-button-danger` | 危险/删除按钮 | 红色渐变 |

### 3. 输入框

| 类名 | 用途 | 效果 |
|-------|------|------|
| `glass-input` | 文本/搜索输入框 | 模糊 + 内阴影 |
| `glass-input:focus` | 聚焦状态 | 高亮边框 |

### 4. 标签

| 类名 | 用途 | 效果 |
|-------|------|------|
| `glass-tag` | 分类/筛选标签 | 渐变色 + 模糊 |
| `glass-tag:hover` | 悬停状态 | 上移动画 |

### 5. 图标容器

| 类名 | 用途 | 效果 |
|-------|------|------|
| `glass-icon` | 功能图标 | 圆形容器 + 高光效果 |
| `glass-icon:hover` | 悬停状态 | 上移 + 缩放 |

---

## 渐变配色方案

系统内置多种渐变色，可通过添加对应的类名使用：

```tsx
<div className="glass-card glass-gradient-blue">  {/* 蓝色主题 */}
</div>
```

| 渐变类 | 颜色风格 |
|---------|----------|
| `glass-gradient-blue` | 蓝色 (#3b82f6 → #2563eb) |
| `glass-gradient-green` | 绿色 (#22c55e → #10b981) |
| `glass-gradient-purple` | 紫色 (#8b5cf6 → #6366f1) |
| `glass-gradient-orange` | 橙色 (#fb923c → #f97316) |
| `glass-text-gradient` | 金色文字渐变 |

---

## 高级效果

### 浮动动画

```tsx
<div className="glass-float">
  {/* 带浮动动画的内容 */}
</div>
```

### 波浪背景

```tsx
<div className="glass-wave">
  {/* 在底部添加波浪效果 */}
</div>
```

### 渐变边框

```tsx
<div className="glass-border-gradient">
  {/* 带渐变边框的内容 */}
</div>
```

### 网格背景

```tsx
<div className="glass-grid-bg">
  {/* 动态网格背景 */}
</div>
```

---

## 响应式优化

所有组件都已针对移动端优化：

| 屏幕尺寸 | 优化内容 |
|---------|----------|
| `< 640px` | 减小卡片圆角、减少模糊值 |
| `≥ 640px` | 标准毛玻璃效果 |

---

## 深色模式支持

在深色模式下，卡片会自动变得更透明：

```tsx
<div className="glass-card dark:glass-card">
  {/* 内容 */}
</div>
```

---

## 性能考虑

### 在低性能设备上禁用模糊

系统会自动检测用户是否设置了 `减少动画` 偏好：

```css
@media (prefers-reduced-motion: no-preference) {
  .glass-card {
    backdrop-filter: none !important;
    animation: none !important;
  }
}
```

---

## 完整示例

### 题目卡片示例

```tsx
import '../styles/glassmorphism.css';

<div className="glass-card">
  <div className="glass-icon">📚</div>
  <h2 className="glass-text-glow">题目标题</h2>
  <p>题目内容...</p>
  <div className="flex gap-2">
    <button className="glass-button glass-button-primary">
      下载
    </button>
    <button className="glass-button glass-button-success">
      收藏
    </button>
  </div>
</div>
```

### 搜索输入框示例

```tsx
import '../styles/glassmorphism.css';

<input
  type="text"
  placeholder="搜索题目..."
  className="glass-input"
/>
```

### 标签按钮示例

```tsx
import '../styles/glassmorphism.css';

<div className="flex flex-wrap gap-2">
  <button className="glass-tag">数学</button>
  <button className="glass-tag glass-gradient-blue">物理</button>
  <button className="glass-tag">英语</button>
</div>
```

---

## 自定义主题颜色

要修改毛玻璃效果的主色调，可以在 `tailwind.config.ts` 中添加自定义颜色：

```typescript
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      'glass-bg': {
        light: 'rgba(255, 255, 255, 0.08)',
        dark: 'rgba(0, 0, 0, 0.15)',
      },
      'glass-border': {
        light: 'rgba(255, 255, 255, 0.1)',
        dark: 'rgba(255, 255, 255, 0.2)',
      },
    },
  },
}
```

---

## 常见问题

### 样式不生效

1. 确保在文件顶部导入了样式文件：
   ```tsx
   import '../styles/glassmorphism.css';
   ```

2. 如果使用 Tailwind，确保样式不被覆盖：
   - 在类名前加上 `!important`（如需要）
   - 或使用 `group` 类避免冲突

### 移动端性能问题

1. 减少同时使用毛玻璃效果的元素数量
2. 使用 `will-change: transform` 属性优化
3. 避免在列表中使用复杂的阴影效果

---

## 浏览器兼容性

| 特性 | Chrome | Safari | Firefox | Edge |
|-------|--------|--------|---------|------|
| backdrop-filter | ✅ | ✅ | ✅ | ✅ |
| -webkit-... | ✅ | ✅ | ✅ | ✅ |
| box-shadow | ✅ | ✅ | ✅ | ✅ |

---

## 参考资源

- [Apple Design](https://developer.apple.com/design/human-interface-guidelines/macos)
- [Material Design](https://m3.material.io/)
- [Glassmorphism Generator](https://glassmorphism.com/)
- [CSS Tricks - Glassmorphism](https://css-tricks.com/snippet/5-glassmorphism-card/)
