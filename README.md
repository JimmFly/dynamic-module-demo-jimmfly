# Dynamic Module Executor

一个支持动态模块加载和热重载的 TypeScript HTTP 服务器项目。

## 功能特性

- ✅ HTTP服务器运行在 `http://localhost:8080`
- ✅ 动态模块加载：无需重启服务器即可加载新模块
- ✅ 热重载：修改现有模块函数后自动生效
- ✅ Web界面：提供友好的前端界面调用函数
- ✅ SQLite数据库：记录所有函数执行历史
- ✅ 安全执行：不使用eval，通过安全的参数解析执行函数

## 安装和运行

```bash
# 安装依赖
npm install

# 启动开发服务器（直接运行 TypeScript）
npm start
# 或
npm run dev

# 编译 TypeScript 到 JavaScript
npm run build

# 运行编译后的文件
node dist/main.js
```

## 使用方法

1. 启动服务器后访问 `http://localhost:8080`
2. 在输入框中输入函数调用，格式：`模块名.函数名(参数)`
3. 点击"Execute"按钮执行函数
4. 点击"Refresh Modules"按钮刷新可用模块列表

### 示例调用

```javascript
// 调用cat模块的sayHi函数
cat.sayHi('Hello', 'Whiskers')

// 调用duck模块的walk函数
duck.walk('Donald')

// 调用新添加的dog模块
dog.fetch('Buddy', 'ball')
dog.bark('Rex', 3)

// 调用新添加的cat函数
cat.purr('Fluffy', 8)
cat.sleep('Mittens', 'windowsill')
```

## 动态模块加载测试

### 测试1：添加新模块
1. 在`scripts/`目录下创建新的`.ts`文件（如`dog.ts`）
2. 无需重启服务器，直接在Web界面点击"Refresh Modules"
3. 新模块会立即出现在可用模块列表中

### 测试2：修改现有模块
1. 在现有模块文件中添加新函数（如在`cat.ts`中添加`purr`函数）
2. 无需重启服务器，新函数立即可用
3. 在Web界面中可以直接调用新添加的函数

## 项目结构

```
├── main.ts              # 主服务器文件（TypeScript）
├── package.json         # 项目配置和依赖
├── tsconfig.json        # TypeScript 配置
├── execution_log.db     # SQLite数据库（自动创建）
├── public/              # 前端资源
│   └── app.ts          # 前端 TypeScript 文件
├── scripts/             # 动态模块目录
│   ├── cat.ts          # 猫模块
│   ├── duck.ts         # 鸭子模块
│   ├── dog.ts          # 狗模块
│   └── egg.ts          # 鸡蛋模块
└── dist/               # 编译输出目录（npm run build 后生成）
```

## 技术实现

- **TypeScript 支持**：使用 ts-node 直接运行 TypeScript 文件，支持类型检查
- **动态模块加载**：通过清除`require.cache`实现模块热重载
- **安全执行**：使用正则表达式解析函数调用，避免使用`eval`
- **数据库记录**：使用SQLite记录每次函数执行的输入和输出
- **Web界面**：提供现代化的响应式Web界面
- **实时编译**：前端 TypeScript 文件在运行时编译为 JavaScript

## 数据库结构

```sql
CREATE TABLE execution_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_string TEXT NOT NULL,      -- 函数调用字符串
    result TEXT NOT NULL,           -- 执行结果
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API端点

- `GET /` - 主页面
- `GET /api/modules` - 获取可用模块列表
- `POST /api/execute` - 执行函数调用