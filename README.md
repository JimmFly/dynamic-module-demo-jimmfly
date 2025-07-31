# Dynamic Module Demo Jimmfly

一个高性能的动态模块执行器，支持热重载功能的 TypeScript HTTP 服务器项目。

## 功能特性

- 🚀 **高性能HTTP服务器**：自动端口检测，支持 8080/8081 端口
- 🔄 **动态模块加载**：无需重启服务器即可加载新模块
- 🔥 **热重载功能**：修改现有模块函数后自动生效
- 🌐 **现代化Web界面**：响应式设计，支持实时模块刷新
- 💾 **SQLite数据库**：完整记录所有函数执行历史和日志
- 🔒 **安全执行环境**：智能参数解析和验证，避免代码注入
- 📝 **详细错误提示**：语义化错误信息，支持中文逗号检测
- ⚡ **TypeScript支持**：完整的类型检查和开发时编译
- 🎯 **参数验证**：自动检测必需参数和参数类型
- 📊 **执行日志**：可视化执行历史和结果查看

## 安装和运行

```bash
# 安装依赖
npm install

# 开发模式（推荐）- 直接运行 TypeScript
npm run dev

# 开发模式 + 文件监听（自动重启）
npm run dev:watch

# 生产模式 - 编译并运行
npm start  # 会自动执行 build 然后启动

# 手动编译 TypeScript
npm run build

# 监听模式编译
npm run build:watch

# 清理编译文件
npm run clean
```

## 使用方法

### 基本操作

1. 启动服务器后访问 `http://localhost:8080`
2. 在输入框中输入函数调用，格式：`模块名.函数名(参数)`
3. 点击 "Execute" 按钮执行函数
4. 点击 "🔄 Refresh" 按钮刷新可用模块列表
5. 点击 "📊 Logs" 按钮查看执行历史
6. 点击 "🗑️ Clear Logs" 清空执行日志

### 高级功能

- **自动刷新**：启用后每3秒自动检测模块变化
- **参数验证**：系统会自动验证必需参数和参数类型
- **错误提示**：提供详细的语义化错误信息
- **执行历史**：所有执行记录都会保存到SQLite数据库

### 示例调用

```javascript
// Bird 模块
bird.fly('Eagle', 100)  // 让鸟儿飞行

// Cat 模块
cat.sayHi('Hello', 'Whiskers')     // 猫咪打招呼
cat.purr('Fluffy', 8)              // 猫咪呼噜声
cat.sleep('Mittens', 'windowsill') // 猫咪睡觉

// Dog 模块
dog.fetch('Buddy', 'ball')  // 狗狗捡球
dog.bark('Rex', 3)          // 狗狗叫声

// Duck 模块
duck.sayHi('Hello', 'Donald')      // 鸭子打招呼
duck.walk('Donald')                // 鸭子走路
duck.swim('Donald', 'pond')        // 鸭子游泳
duck.quack('Donald', 5)            // 鸭子叫声

// Egg 模块
egg.lay('Chicken')  // 下蛋
```

### 错误处理示例

```javascript
// 参数不足
dog.bark()  // 错误：Missing required parameter 'name' (string)

// 中文逗号错误
bird.fly("Eagle"，100)  // 错误：Invalid comma character. Use English comma (,)

// 尾随逗号错误
cat.purr("Fluffy",)  // 错误：Trailing comma in arguments

// 无效模块
unknown.test()  // 错误：Module 'unknown' not found
```

## 动态模块加载测试

### 测试1：添加新模块
1. 在`scripts/`目录下创建新的`.ts`文件（如`robot.ts`）
2. 无需重启服务器，直接在Web界面点击"Refresh Modules"
3. 新模块会立即出现在可用模块列表中

### 测试2：修改现有模块
1. 在现有模块文件中添加新函数（如在`cat.ts`中添加`purr`函数）
2. 无需重启服务器，新函数立即可用
3. 在Web界面中可以直接调用新添加的函数

## 项目结构

```
├── package.json         # 项目配置和依赖
├── tsconfig.json        # TypeScript 配置
├── nodemon.json         # Nodemon 配置
├── execution_log.db     # SQLite数据库（自动创建）
├── src/                 # 源代码目录
│   ├── main.ts         # 应用程序入口点
│   ├── client/         # 前端代码
│   │   └── app.ts      # 客户端 TypeScript 应用
│   ├── server/         # 服务器代码
│   │   ├── server.ts   # HTTP 服务器实现
│   │   ├── routes.ts   # 路由处理
│   │   └── htmlTemplate.ts # HTML 模板生成
│   ├── modules/        # 模块管理
│   │   └── moduleManager.ts # 动态模块加载器
│   ├── database/       # 数据库相关
│   │   └── sqlite.ts   # SQLite 数据库操作
│   ├── utils/          # 工具函数
│   │   ├── auth.ts     # 认证工具
│   │   ├── config.ts   # 配置管理
│   │   ├── cors.ts     # CORS 处理
│   │   ├── logger.ts   # 日志系统
│   │   ├── network.ts  # 网络工具
│   │   ├── rateLimiter.ts # 速率限制
│   │   └── sanitizer.ts   # 输入清理
│   └── types/          # TypeScript 类型定义
│       └── index.ts    # 通用类型定义
├── scripts/             # 动态模块目录
│   ├── bird.ts        # 鸟模块
│   ├── cat.ts         # 猫模块
│   ├── duck.ts        # 鸭子模块
│   └── egg.ts         # 鸡蛋模块
└── dist/              # 编译输出目录（npm run build 后生成）
```

## 技术实现

### 核心技术栈

- **TypeScript 5.8+**：完整的类型检查和现代 ES 特性支持
- **Node.js 16+**：高性能 JavaScript 运行时
- **SQLite3**：轻量级嵌入式数据库
- **ts-node**：直接运行 TypeScript，无需预编译

### 架构特性

- **模块化设计**：清晰的分层架构，易于维护和扩展
- **动态模块加载**：通过清除 `require.cache` 实现模块热重载
- **智能参数解析**：使用正则表达式和 AST 解析，避免 `eval` 安全风险
- **自动端口检测**：智能检测可用端口（8080/8081）
- **CORS 支持**：完整的跨域资源共享配置
- **速率限制**：防止 API 滥用的请求频率控制
- **输入清理**：全面的输入验证和清理机制
- **错误处理**：详细的错误分类和用户友好的错误信息

### 安全特性

- **参数验证**：严格的参数类型和必需性检查
- **输入清理**：防止代码注入和恶意输入
- **API 认证**：基于密钥的 API 访问控制
- **请求限制**：防止 DoS 攻击的速率限制

## 数据库结构

```sql
CREATE TABLE execution_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_string TEXT NOT NULL,      -- 函数调用字符串
    result TEXT NOT NULL,           -- 执行结果
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API 端点

### 主要端点

- `GET /` - 主页面（Web 界面）
- `GET /client.js` - 客户端 JavaScript 文件
- `GET /api/modules` - 获取可用模块列表
- `POST /api/execute` - 执行函数调用
- `GET /api/logs` - 获取执行日志
- `DELETE /api/logs` - 清空执行日志

### API 详细说明

#### 获取模块列表
```http
GET /api/modules?forceRefresh=true
```

#### 执行函数
```http
POST /api/execute
Content-Type: application/json

{
  "callString": "dog.bark('Buddy', 3)"
}
```

#### 响应格式
```json
// 成功响应
{
  "result": "Dog Buddy barked 3 times! Woof woof!"
}

// 错误响应
{
  "error": "Missing required parameter 'name' (string)"
}
```

## 环境要求

- **Node.js**: >= 16.0.0
- **npm**: >= 7.0.0
- **操作系统**: macOS, Linux, Windows

## 环境变量配置

项目支持通过环境变量进行配置。请复制 `.env.example` 文件为 `.env` 并根据需要修改配置：

```bash
cp .env.example .env
```

### 主要环境变量

- `API_KEY`: API 认证密钥（生产环境必需）
- `NODE_ENV`: 运行环境（development/production）
- `PORT`: 自定义端口（可选，默认自动检测）
- `DEBUG`: 启用调试日志（可选）

## 开发指南

### 快速开始

1. **环境配置**：复制并配置环境变量
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，设置 API_KEY 等配置
   ```

2. **安装依赖**：
   ```bash
   npm install
   ```

3. **启动开发服务器**：
   ```bash
   npm run dev
   ```

### 添加新模块

1. 在 `scripts/` 目录下创建新的 `.ts` 文件
2. 导出函数并添加 JSDoc 注释
3. 无需重启服务器，点击刷新即可加载

### 模块示例

```typescript
/**
 * Make a robot move
 * @param name - Robot name
 * @param direction - Movement direction
 * @returns Movement message
 */
export const move = (name: string, direction: string): string => {
  return `Robot ${name} is moving ${direction}!`;
};
```