# 🔐 端到端加密临时聊天室系统

一个完全安全的临时加密聊天室系统,采用军事级端到端加密,所有消息在1小时后自动销毁。

## ✨ 核心特性

- **🔒 真正的端到端加密**: 采用 X25519 (Curve25519) ECDH + AES-256-GCM
- **⏱️ 自动销毁**: 所有聊天记录在1小时后自动彻底销毁
- **🚫 无需注册**: 打开即用,不保存任何个人信息
- **🔐 服务器盲化**: 服务器仅存储和转发密文,无法解密消息内容
- **👥 实时在线状态**: 显示当前房间内的在线用户
- **🌐 高熵房间Token**: 使用 256-bit 随机 token,碰撞概率可忽略不计

## 🛠️ 技术栈

- **前端框架**: Next.js 14 (App Router) + TypeScript
- **样式**: Tailwind CSS
- **实时通信**: Supabase Realtime (Broadcast + Presence)
- **数据库**: Supabase PostgreSQL + pg_cron
- **加密**: Web Crypto API (浏览器原生)
- **部署**: Vercel

## 🔐 加密机制

### 密钥交换流程

1. 每个用户进入聊天室时自动生成临时 X25519 密钥对
2. 通过 Supabase Realtime Broadcast 广播公钥
3. 客户端本地执行 ECDH 协议派生共享密钥
4. 共享密钥仅存在于浏览器内存,永不持久化

### 消息加密流程

1. 使用 AES-256-GCM 对称加密算法加密消息
2. 每条消息使用独立的 96-bit 随机 IV
3. 加密后的密文通过 Supabase Realtime 广播
4. 接收方使用共享密钥在本地解密

### 安全保证

- ✅ 服务器无法读取消息内容
- ✅ 所有加密/解密操作在浏览器本地完成
- ✅ 使用 128-bit 认证标签防止篡改
- ✅ 房间过期后彻底删除所有数据

## 📋 前置要求

- Node.js 18+
- npm 或 yarn
- Supabase 账号 (免费)
- Vercel 账号 (可选,用于部署)

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd e2ee-chat
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置 Supabase

#### 3.1 创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com)
2. 创建新项目
3. 等待项目初始化完成

#### 3.2 启用 pg_cron 扩展

1. 进入 Supabase Dashboard
2. 导航到 **Database** → **Extensions**
3. 搜索 `pg_cron` 并启用

#### 3.3 执行数据库初始化脚本

1. 导航到 **Database** → **SQL Editor**
2. 点击 **New Query**
3. 复制 `database.sql` 文件的全部内容并粘贴
4. 点击 **Run** 执行

#### 3.4 验证定时任务

执行以下 SQL 确认自动清理任务已创建:

```sql
SELECT * FROM cron.job WHERE jobname = 'cleanup-expired-chat-rooms';
```

#### 3.5 获取 API 凭证

1. 导航到 **Settings** → **API**
2. 复制以下信息:
   - Project URL
   - anon public (public key)

### 4. 配置环境变量

```bash
cp .env.local.example .env.local
```

编辑 `.env.local` 并填入 Supabase 凭证:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 📦 项目结构

```
e2ee-chat/
├── app/
│   ├── page.tsx                    # 首页 (创建/加入聊天室)
│   ├── room/[id]/page.tsx          # 聊天室页面
│   └── api/
│       └── rooms/
│           ├── route.ts            # 创建聊天室 API
│           └── [id]/route.ts       # 验证聊天室 API
├── lib/
│   ├── crypto.ts                   # 端到端加密核心逻辑
│   ├── supabase.ts                 # Supabase 客户端
│   └── types.ts                    # TypeScript 类型定义
├── database.sql                    # 数据库初始化脚本
└── README.md                       # 项目文档
```

## 🌐 部署到 Vercel

### 1. 推送到 GitHub

```bash
git init
git add .
git commit -m "Initial commit: E2EE Chat System"
git branch -M main
git remote add origin https://github.com/your-username/e2ee-chat.git
git push -u origin main
```

### 2. 部署到 Vercel

#### 方法 A: 通过 Vercel Dashboard

1. 访问 [https://vercel.com](https://vercel.com)
2. 点击 **New Project**
3. 导入 GitHub 仓库
4. 添加环境变量:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. 点击 **Deploy**

#### 方法 B: 通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 部署
vercel --prod
```

在部署过程中,系统会提示添加环境变量。

### 3. 验证部署

访问 Vercel 提供的 URL,测试以下功能:

- [x] 创建聊天室
- [x] 分享房间链接
- [x] 多个用户加入同一房间
- [x] 发送和接收加密消息
- [x] 查看在线用户列表
- [x] 验证房间1小时后自动过期

## 🧪 本地测试

### 测试端到端加密

1. 在浏览器中打开 [http://localhost:3000](http://localhost:3000)
2. 点击 **创建新聊天室**
3. 复制房间链接
4. 在**隐私模式窗口**中打开相同链接
5. 在两个窗口中发送消息
6. 打开浏览器开发者工具 → Console 查看加密日志:
   - `🔐 密钥对已生成`
   - `🔑 收到 XXX 的公钥`
   - `✅ 已与 XXX 建立加密通道`

### 验证服务器无法解密

1. 打开 Supabase Dashboard → **Database** → **Table Editor**
2. 查看 `chat_rooms` 表,仅包含元数据
3. 验证没有存储任何消息内容 (仅通过 Realtime 传输密文)

## 📚 API 文档

### POST /api/rooms

创建新的聊天室

**Response:**

```json
{
  "success": true,
  "room": {
    "id": "base64url-encoded-256bit-token",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "expiresAt": "2024-01-15T11:30:00.000Z",
    "maxUsers": 50
  }
}
```

### GET /api/rooms/[id]

验证聊天室是否存在且未过期

**Response (成功):**

```json
{
  "exists": true,
  "room": {
    "id": "...",
    "createdAt": "...",
    "expiresAt": "...",
    "expiresIn": 3540000,
    "maxUsers": 50
  }
}
```

**Response (已过期):**

```json
{
  "error": "聊天室已过期",
  "exists": false,
  "expired": true
}
```

## 🔍 安全审计

### 加密强度

- **密钥交换**: X25519 (Curve25519) - 128-bit 安全级别
- **对称加密**: AES-256-GCM - 256-bit 密钥
- **随机数生成**: `crypto.randomUUID()` / `crypto.getRandomValues()`
- **认证标签**: 128-bit GCM 认证

### 已知限制

1. **无前向保密 (Forward Secrecy)**: 密钥泄露后历史消息可被解密
   - 缓解措施: 1小时后自动销毁所有数据
2. **群聊密钥共享**: 当前实现中所有用户共享相同的会话密钥
   - 缓解措施: 适用于临时小规模聊天场景
3. **无公钥验证机制**: 理论上存在中间人攻击可能
   - 缓解措施: 显示公钥指纹供用户验证

### 改进建议

- [ ] 实现 Signal Protocol 的 Double Ratchet 算法
- [ ] 添加公钥指纹显示和验证
- [ ] 实现消息签名和身份验证
- [ ] 支持文件加密传输

## 🐛 故障排除

### 问题: 无法连接到 Supabase

**解决方案**:

1. 检查 `.env.local` 文件是否正确配置
2. 确认 Supabase URL 和 Key 没有多余的空格
3. 验证 Supabase 项目是否处于活跃状态

### 问题: 定时清理任务未执行

**解决方案**:

1. 确认 `pg_cron` 扩展已启用
2. 执行 `SELECT * FROM cron.job;` 查看任务列表
3. 手动触发清理: `DELETE FROM chat_rooms WHERE expires_at < NOW();`

### 问题: 消息无法解密

**解决方案**:

1. 打开浏览器 Console 查看错误日志
2. 确认双方都已建立加密通道 (`✅ 已与 XXX 建立加密通道`)
3. 刷新页面重新加入聊天室

### 问题: Vercel 部署失败

**解决方案**:

1. 检查环境变量是否正确配置
2. 确认使用 Node.js 18+ 运行时
3. 查看 Vercel 部署日志获取详细错误信息

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request!

## 🙏 致谢

- [Supabase](https://supabase.com) - 提供实时通信和数据库服务
- [Vercel](https://vercel.com) - 提供部署平台
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) - 提供浏览器原生加密功能

---

**⚠️ 安全声明**: 本项目仅用于教育和演示目的。虽然采用了行业标准的加密算法,但未经过专业安全审计,不建议用于处理高度敏感信息。
