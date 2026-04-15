/**
 * 虎皮椒签名测试工具
 * 用于验证签名生成是否正确
 */

import CryptoJS from 'crypto-js';

// 测试参数 (使用你的真实配置)
const testParams = {
  name: 'TradeGrail会员订阅',
  pay_type: 'alipay',
  price: '0.01', // 测试用 1 分钱
  order_id: 'test_' + Date.now(),
  notify_url: 'https://yourdomain.com/api/xorpay-callback',
  app_secret: '10b1cec33b32449288251576768ce52c' // 你的 APP_SECRET
};

// 生成签名
const signString = `${testParams.name}${testParams.pay_type}${testParams.price}${testParams.order_id}${testParams.notify_url}${testParams.app_secret}`;
const sign = CryptoJS.MD5(signString).toString();

console.log('=== 虎皮椒签名测试 ===\n');
console.log('参数:');
console.log('  name:', testParams.name);
console.log('  pay_type:', testParams.pay_type);
console.log('  price:', testParams.price);
console.log('  order_id:', testParams.order_id);
console.log('  notify_url:', testParams.notify_url);
console.log('\n拼接字符串 (不含密钥):');
console.log(`  ${testParams.name}${testParams.pay_type}${testParams.price}${testParams.order_id}${testParams.notify_url}[SECRET]`);
console.log('\n完整拼接字符串:');
console.log(`  ${signString}`);
console.log('\nMD5 签名:');
console.log(`  ${sign}`);
console.log('\n可以用这个签名在虎皮椒后台测试工具验证');
