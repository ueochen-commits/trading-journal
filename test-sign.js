const CryptoJS = require('crypto-js');

// 测试参数
const params = {
  name: 'TradeGrail会员订阅',
  pay_type: 'alipay',
  price: '0.01',
  order_id: 'test_123456',
  notify_url: 'https://dashboard.tradegrail.net/api/xorpay-callback',
  app_secret: '10b1cec33b32449288251576768ce52c'
};

// 生成签名
const signString = `${params.name}${params.pay_type}${params.price}${params.order_id}${params.notify_url}${params.app_secret}`;
const sign = CryptoJS.MD5(signString).toString();

console.log('=== 虎皮椒签名测试 ===\n');
console.log('参数:');
console.log('  name:', params.name);
console.log('  pay_type:', params.pay_type);
console.log('  price:', params.price);
console.log('  order_id:', params.order_id);
console.log('  notify_url:', params.notify_url);
console.log('\n拼接字符串:');
console.log(signString);
console.log('\nMD5 签名:');
console.log(sign);
console.log('\n你可以用这个签名在虎皮椒后台的 API 调试工具测试');
