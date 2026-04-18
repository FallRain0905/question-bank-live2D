# 生产环境Live2D问题调试指南

## 为什么本地可以运行，服务器却不能？

这是典型的开发/生产环境差异问题。以下是可能的根本原因和解决方案。

## 可能的原因分析

### 1. Next.js构建问题 ⚠️

**问题：** 生产构建时，`public/libs/` 中的库文件可能没有被正确处理

**症状：**
- 本地开发：`npm run dev` 直接服务public文件夹
- 生产环境：`npm run build && npm start` 使用构建输出

**检查方法：**
```bash
# 1. 检查构建输出
npm run build
ls -la .next/static/libs/

# 2. 检查public文件夹是否被复制
ls -la out/libs/  # 如果使用next export
ls -la build/libs/  # 如果使用build输出目录

# 3. 对比public和构建输出
diff -r public/libs/ .next/static/libs/
```

**解决方案：**
- 确保 `public/libs/` 中的所有文件都存在于构建输出中
- 检查 `.gitignore` 是否错误地排除了库文件
- 验证构建配置正确复制静态资源

### 2. 环境变量差异 🌍

**问题：** 开发环境和生产环境的变量设置不同

**检查方法：**
```bash
# 检查服务器环境变量
env | grep -i live2d
env | grep -i next

# 检查Next.js配置中的环境变量
cat next.config.ts | grep -i env

# 检查.env文件
cat .env
cat .env.production
cat .env.local
```

**解决方案：**
- 确保所有环境变量在服务器上正确设置
- 添加默认值处理：
  ```javascript
  const live2DEnabled = process.env.NEXT_PUBLIC_LIVE2D_ENABLED !== 'false';
  ```

### 3. 浏览器兼容性问题 🌐

**问题：** 服务器用户使用的浏览器可能与开发环境不同

**检查方法：**
- 打开浏览器开发者工具
- 检查Console是否有Live2D相关错误
- 检查Network标签，查看文件请求是否成功
- 检查浏览器是否支持WebGL：
  ```javascript
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  console.log('WebGL支持:', !!gl);
  ```

**解决方案：**
- 添加浏览器兼容性检测
- 提供降级方案
- 添加用户友好的错误提示

### 4. 网络和CDN问题 🌐

**问题：** 服务器网络配置可能导致文件加载失败

**检查方法：**
```bash
# 1. 直接测试文件可访问性
curl -I https://your-domain.com/libs/pixi.min.js
curl -I https://your-domain.com/libs/live2d.min.js

# 2. 检查HTTP响应头
curl -v https://your-domain.com/libs/pixi.min.js 2>&1 | grep -i "content-type"

# 3. 检查文件大小
curl -s https://your-domain.com/libs/pixi.min.js | wc -c

# 4. 对比本地和服务器文件
ls -lh public/libs/pixi.min.js
curl -s https://your-domain.com/libs/pixi.min.js | wc -c
```

**解决方案：**
- 检查服务器是否正确设置了Content-Type
- 确保文件权限正确（`chmod 644`）
- 检查服务器是否支持文件范围请求
- 考虑使用CDN来提供库文件

### 5. Next.js版本兼容性问题 ⚠️

**问题：** 本地和生产环境可能使用不同版本的Next.js

**检查方法：**
```bash
# 检查本地Next.js版本
npm list next

# 检查package.json中的Next.js版本
cat package.json | grep "next"

# 检查服务器上的Next.js版本
# 在服务器运行
npm list next
```

**解决方案：**
- 确保开发和生产环境使用相同版本的Next.js
- 锁定Next.js版本：
  ```json
  {
    "next": "15.1.3",
    "resolutions": {
      "next": "15.1.3"
    }
  }
  ```

### 6. 文件路径和路由问题 🗺️

**问题：** 服务器上的文件路径可能与本地不同

**检查方法：**
```bash
# 1. 检查实际的文件路径
find public -name "*.min.js" -type f

# 2. 检查应用中的路径引用
grep -r "libs/" app/ components/

# 3. 检查服务器部署的文件结构
ls -la /path/to/deployment/public/libs/
```

**解决方案：**
- 使用绝对路径或环境变量配置路径
- 添加路径验证和错误提示
- 配置Next.js的publicPath：
  ```javascript
  // next.config.ts
  const nextConfig = {
    basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
    assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
  };
  ```

## 立即调试步骤

### 步骤1：添加详细的加载日志

在服务器环境中添加更多调试信息：

```javascript
// 在 Live2DCharacter.tsx 中添加
console.log('当前环境:', process.env.NODE_ENV);
console.log('当前URL:', window.location.href);
console.log('Live2D启用状态:', settings.visible);

// 检查文件是否存在
fetch('/libs/pixi.min.js')
  .then(response => {
    console.log('PIXI文件检查:', {
      status: response.status,
      url: response.url,
      contentType: response.headers.get('Content-Type')
    });
  });
```

### 步骤2：创建测试页面

创建一个简单的测试页面来验证文件加载：

```javascript
// app/test-live2d/page.tsx
'use client';

export default function TestLive2D() {
  const [results, setResults] = useState<any[]>([]);

  const testFile = async (path: string) => {
    try {
      const response = await fetch(path);
      const result = {
        path,
        status: response.status,
        contentType: response.headers.get('Content-Type'),
        size: response.headers.get('Content-Length'),
        success: response.ok
      };
      setResults(prev => [...prev, result]);
      return result;
    } catch (error) {
      const result = {
        path,
        error: error instanceof Error ? error.message : String(error),
        success: false
      };
      setResults(prev => [...prev, result]);
      return result;
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Live2D文件加载测试</h1>
      <div className="space-y-2">
        <button
          onClick={() => testFile('/libs/pixi.min.js')}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          测试 PIXI
        </button>
        <button
          onClick={() => testFile('/libs/live2dcubismcore.min.js')}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          测试 Live2D Core
        </button>
        <button
          onClick={() => testFile('/libs/live2d.min.js')}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          测试 Live2D
        </button>
        <button
          onClick={() => testFile('/libs/index.min.js')}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          测试 Adapter
        </button>
        <button
          onClick={() => testFile('/live2d/model/neko/ziraitikuwa.model3.json')}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          测试模型文件
        </button>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-2">测试结果</h2>
        <div className="bg-gray-100 p-4 rounded">
          {results.map((result, index) => (
            <div key={index} className={`mb-2 p-2 ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
              <div><strong>{result.path}</strong></div>
              <div>Status: {result.status}</div>
              <div>Content-Type: {result.contentType}</div>
              {result.size && <div>Size: {result.size} bytes</div>}
              {result.error && <div>Error: {result.error}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 步骤3：检查生产构建

在本地测试生产构建：

```bash
# 1. 清理旧的构建
rm -rf .next out build dist

# 2. 运行生产构建
NODE_ENV=production npm run build

# 3. 检查构建输出
ls -la .next/static/libs/

# 4. 本地测试生产构建
npx serve out  # 或使用其他静态服务器

# 5. 在本地浏览器中访问
# http://localhost:3000/test-live2d
```

### 步骤4：服务器部署调试

在服务器上执行调试：

```bash
# 1. 检查部署目录
ls -la /var/www/your-app/public/libs/

# 2. 检查文件权限
ls -la /var/www/your-app/public/libs/*.js

# 3. 检查服务器环境变量
cat /var/www/your-app/.env.production

# 4. 检查Next.js进程
ps aux | grep next

# 5. 查看服务器日志
tail -f /var/log/your-app/error.log
journalctl -u next -f
```

## 服务器配置检查清单

### 服务器环境
- [ ] Node.js版本是否匹配本地开发环境
- [ ] npm版本是否匹配本地开发环境
- [ ] 服务器操作系统和配置是否支持WebGL
- [ ] 防火墙是否阻止了静态资源请求

### Next.js配置
- [ ] `publicPath` 或 `basePath` 配置是否正确
- [ ] 静态文件处理是否正确
- [ ] 图片和静态资源配置是否正确
- [ ] 构建优化设置是否影响静态资源

### 应用配置
- [ ] 环境变量是否正确设置
- [ ] Live2D相关配置是否正确
- [ ] 文件路径是否正确
- [ ] 错误处理和日志是否完善

### 文件部署
- [ ] 所有必需的库文件是否已部署
- [ ] 模型文件是否已部署
- [ ] 文件权限是否正确
- [ ] 文件大小是否与本地一致

## 快速修复方案

### 方案1：立即禁用Live2D

如果需要立即解决问题，可以暂时禁用：

```javascript
// 在组件中添加环境检查
const live2DEnabled = process.env.NODE_ENV !== 'production';

// 或使用配置文件
const [settings] = getLive2DSettings();
const shouldShowLive2D = settings.visible && live2DEnabled;
```

### 方案2：添加回退机制

改进Live2D组件的错误处理：

```javascript
const [loadAttempts, setLoadAttempts] = useState(0);
const [loadMode, setLoadMode] = useState<'npm' | 'manual'>('manual');

const loadWithFallback = async () => {
  // 首先尝试npm包
  try {
    setLoadMode('npm');
    // npm包加载逻辑
  } catch {
    setLoadMode('manual');
    // 回退到手动加载方式
    await loadScript('/libs/pixi.min.js');
  }
};
```

### 方案3：改进服务器配置

检查并修复服务器配置：

1. **Nginx/Apache配置**：
   ```nginx
   # 确保静态资源正确服务
   location /libs/ {
     expires 1y;
     add_header Cache-Control "public, immutable";
     add_header X-Content-Type-Options "nosniff";
   }
   ```

2. **HTTPS配置**：
   - 确保使用有效的SSL证书
   - 检查混合内容问题

3. **CDN配置**：
   - 考虑将静态文件放到CDN
   - 配置正确的缓存策略

## 总结

本地可以运行但服务器不能运行的主要原因是：

1. **构建环境差异**：开发环境直接服务public文件夹，生产环境使用构建输出
2. **文件部署问题**：库文件可能没有被正确复制到生产环境
3. **配置差异**：环境变量、路径配置等可能不一致
4. **网络/权限问题**：服务器上的文件访问可能受限

**推荐的解决顺序：**
1. 立即：添加调试日志和测试页面
2. 短期：检查构建输出和文件部署
3. 中期：改进错误处理和回退机制
4. 长期：考虑使用npm包替代手动文件加载

这样可以快速定位问题并逐步解决。