# 虎皮椒支付集成修复说明

## 问题诊断

原代码存在以下问题:
1. **CORS 跨域错误** - 浏览器直接调用虎皮椒 API 被阻止
2. **安全风险** - APP_SECRET 暴露在前端代码中
3. **签名生成不安全** - 在前端生成签名容易被篡改

## 解决方案

已创建后端 API 代理来处理支付请求:

### 新增文件

1. **`/api/xorpay-create-order.ts`** - 创建支付订单
2. **`/api/xorpay-callback.ts`** - 处理支付回调

### 修改文件

1. **`services/xorpayService.ts`** - 改为调用后端 API
2. **`.env.example`** - 添加必要的环境变量

## 配置步骤

### 1. 环境变量配置

在 `.env.local` 中添加:

```bash
# Supabase Service Key (从 Supabase Dashboard > Settings > API 获取)
SUPABASE_SERVICE_KEY=your_service_role_key_here

# XorPay 配置
VITE_XORPAY_API_URL=https://xorpay.com
VITE_XORPAY_APP_ID=你的虎皮椒APP_ID
VITE_XORPAY_APP_SECRET=你的虎皮椒APP_SECRET
VITE_XORPAY_TEST_MODE=false  # 测试模式设为 true
```

### 2. 虎皮椒后台配置

登录虎皮椒后台 (https://xorpay.com)，配置回调地址:

- **异步通知地址**: `https://你的域名/api/xorpay-callback`
- **同步跳转地址**: `https://你的域名/payment/success`

### 3. Supabase 数据库表

确保已创建以下表:

#### payment_orders 表
```sql
CREATE TABLE payment_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  xorpay_order_id TEXT,
  xorpay_trade_no TEXT,
  plan TEXT NOT NULL,
  billing_cycle TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'CNY',
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### subscriptions 表
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id),
  plan TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  payment_method TEXT,
  payment_status TEXT,
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'CNY',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 工作流程

1. **用户发起支付** → 前端调用 `createPaymentOrder()`
2. **前端请求后端** → `/api/xorpay-create-order`
3. **后端调用虎皮椒** → 生成签名并创建订单
4. **返回支付链接** → 用户扫码支付
5. **支付成功回调** → 虎皮椒调用 `/api/xorpay-callback`
6. **更新订单状态** → 激活用户订阅

## 测试模式

开发时可以启用测试模式:

```bash
VITE_XORPAY_TEST_MODE=true
```

测试模式下会返回模拟数据,不会真实调用虎皮椒 API。

## 常见问题

### Q: 仍然报 CORS 错误?
A: 确保前端调用的是 `/api/xorpay-create-order` 而不是直接调用虎皮椒 API

### Q: 签名验证失败?
A: 检查以下内容:
- APP_SECRET 是否正确
- 参数顺序: `name + pay_type + price + order_id + notify_url + app_secret`
- 价格格式: 必须是两位小数 (如 `0.01`)

### Q: 回调没有收到?
A:
- 确保回调地址可以公网访问
- 检查虎皮椒后台配置的回调地址是否正确
- 查看服务器日志 `[XorPay Callback]`

## 安全注意事项

1. **永远不要**在前端代码中暴露 `APP_SECRET`
2. **永远不要**在前端生成支付签名
3. **必须**在后端验证回调签名
4. **必须**使用 HTTPS 部署生产环境
5. **建议**使用 Supabase Service Key 而不是 Anon Key 处理回调

## 部署检查清单

- [ ] 环境变量已配置
- [ ] 数据库表已创建
- [ ] 虎皮椒后台回调地址已配置
- [ ] 测试模式已关闭 (`VITE_XORPAY_TEST_MODE=false`)
- [ ] 使用 HTTPS 部署
- [ ] 回调地址可公网访问
