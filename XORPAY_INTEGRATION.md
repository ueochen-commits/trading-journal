# XorPay 支付集成指南

## 📋 概述

本项目已集成 XorPay 支付系统，支持支付宝和微信支付。

---

## 🚀 快速开始

### 1. 注册 XorPay 账号

访问 [XorPay 官网](https://xorpay.com) 注册账号并完成实名认证。

### 2. 获取 API 凭证

在 XorPay 后台获取：
- `APP_ID`：应用 ID
- `APP_SECRET`：应用密钥

### 3. 配置环境变量

在 `.env.local` 文件中添加：

```env
VITE_XORPAY_API_URL=https://api.xorpay.com
VITE_XORPAY_APP_ID=your_xorpay_app_id
VITE_XORPAY_APP_SECRET=your_xorpay_app_secret
```

### 4. 执行数据库迁移

在 Supabase SQL Editor 中执行：

```bash
supabase/migrations/add_xorpay_support.sql
```

---

## 📊 数据库结构

### `subscriptions` 表（已更新）

新增字段：
- `xorpay_order_id` - XorPay 订单 ID
- `xorpay_trade_no` - XorPay 交易号
- `payment_method` - 支付方式（alipay/wechat）
- `payment_status` - 支付状态（pending/paid/failed/refunded）
- `paid_at` - 支付完成时间
- `amount` - 支付金额
- `currency` - 货币（CNY/USD）

### `payment_orders` 表（新增）

记录所有支付订单历史：
- 订单信息（plan, billing_cycle, amount）
- 支付信息（payment_method, payment_status）
- XorPay 相关（xorpay_order_id, xorpay_trade_no）
- 回调数据（callback_data - JSONB）

---

## 💻 使用方法

### 在 PricingModal 中集成支付

```tsx
import PaymentModal from './PaymentModal';
import { useState } from 'react';

const [isPaymentOpen, setIsPaymentOpen] = useState(false);
const [selectedPlan, setSelectedPlan] = useState<{
  plan: 'pro' | 'elite' | 'lifetime';
  billingCycle: 'monthly' | 'yearly' | 'lifetime';
  amount: number;
} | null>(null);

// 点击购买按钮时
const handleBuyClick = (plan, billingCycle, amount) => {
  setSelectedPlan({ plan, billingCycle, amount });
  setIsPaymentOpen(true);
};

// 渲染支付弹窗
{isPaymentOpen && selectedPlan && (
  <PaymentModal
    isOpen={isPaymentOpen}
    onClose={() => setIsPaymentOpen(false)}
    plan={selectedPlan.plan}
    billingCycle={selectedPlan.billingCycle}
    amount={selectedPlan.amount}
  />
)}
```

---

## 🔄 支付流程

### 1. 用户选择方案
- 用户在定价页面选择 Pro/Elite/Lifetime
- 选择月付/年付/终身

### 2. 创建订单
```typescript
const order = await createPaymentOrder({
  plan: 'pro',
  billingCycle: 'yearly',
  paymentMethod: 'alipay',
  amount: 199,
  currency: 'CNY'
});
```

### 3. 调用 XorPay API
- 生成签名
- 创建支付订单
- 获取支付 URL 或二维码

### 4. 用户完成支付
- 支付宝：跳转到支付宝页面
- 微信：显示二维码扫码支付

### 5. 接收回调
- XorPay 发送支付结果到回调 URL
- 验证签名
- 更新订单状态
- 激活用户订阅

### 6. 轮询订单状态
- 前端每 3 秒查询一次订单状态
- 支付成功后刷新页面更新会员状态

---

## 🔐 安全注意事项

### ⚠️ 重要：签名验证

当前代码中的签名生成和验证是**临时实现**，需要根据 XorPay 官方文档完善：

```typescript
// services/xorpayService.ts 中需要完善
const generateXorPaySign = (params: Record<string, string>): string => {
  // TODO: 根据 XorPay 文档实现正确的签名算法
  // 通常是 MD5 或 SHA256
};

const verifyXorPaySign = (data: any): boolean => {
  // TODO: 验证 XorPay 回调的签名
};
```

### 🔒 后端 API 建议

支付回调应该在**后端处理**，而不是前端：

1. 创建 Vercel Serverless Function 或 Supabase Edge Function
2. 接收 XorPay 回调
3. 验证签名
4. 更新数据库

示例：创建 `api/xorpay/callback.ts`

```typescript
// Vercel Serverless Function
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const callbackData = req.body;

  // 验证签名
  if (!verifyXorPaySign(callbackData)) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // 更新订单状态
  await handlePaymentCallback(callbackData);

  res.status(200).json({ success: true });
}
```

---

## 📝 定价配置

在 `PricingModal.tsx` 中配置价格：

```typescript
const pricing = {
  monthly: {
    pro: '29',
    elite: '79',
  },
  yearly: {
    pro: '199',
    elite: '599',
  },
  lifetime: {
    elite: '1999'
  }
};
```

---

## 🧪 测试

### 测试环境

XorPay 通常提供沙箱环境用于测试：

1. 使用测试 APP_ID 和 APP_SECRET
2. 使用测试支付账号
3. 测试支付不会真实扣款

### 测试流程

1. 创建测试订单
2. 使用测试账号支付
3. 验证回调是否正确
4. 检查订阅是否激活

---

## 🐛 常见问题

### Q: 签名验证失败？
A: 检查参数排序、编码方式、密钥是否正确

### Q: 回调没有收到？
A: 检查回调 URL 是否可访问、是否在 XorPay 后台配置

### Q: 订单状态一直是 pending？
A: 检查轮询逻辑、回调是否正常、数据库更新是否成功

### Q: 支付成功但订阅没激活？
A: 检查 `handlePaymentCallback` 函数的逻辑

---

## 📚 参考资料

- [XorPay 官方文档](https://xorpay.com/docs)
- [XorPay API 参考](https://xorpay.com/api)
- [Supabase 文档](https://supabase.com/docs)

---

## 🔄 后续优化

1. **添加退款功能**
2. **添加订阅管理页面**
3. **添加发票系统**
4. **添加优惠券功能**
5. **添加支付失败重试机制**
6. **添加支付超时处理**

---

## 📞 技术支持

如有问题，请联系：
- XorPay 客服
- 项目开发者

---

**注意：** 上线前务必完善签名算法和后端回调处理！
