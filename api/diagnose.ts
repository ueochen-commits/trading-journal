export const config = { runtime: 'nodejs' };

/**
 * 诊断 API - 检查环境变量配置
 */
export default async function handler(req: any, res: any) {
  const envCheck = {
    VITE_XORPAY_APP_ID: {
      exists: !!process.env.VITE_XORPAY_APP_ID,
      length: process.env.VITE_XORPAY_APP_ID?.length || 0,
      value: process.env.VITE_XORPAY_APP_ID ? '***' + process.env.VITE_XORPAY_APP_ID.slice(-3) : 'NOT SET'
    },
    VITE_XORPAY_APP_SECRET: {
      exists: !!process.env.VITE_XORPAY_APP_SECRET,
      length: process.env.VITE_XORPAY_APP_SECRET?.length || 0,
      value: process.env.VITE_XORPAY_APP_SECRET ? '***' + process.env.VITE_XORPAY_APP_SECRET.slice(-4) : 'NOT SET'
    },
    VITE_XORPAY_API_URL: {
      exists: !!process.env.VITE_XORPAY_API_URL,
      value: process.env.VITE_XORPAY_API_URL || 'NOT SET'
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
    }
  };

  return res.status(200).json({
    message: 'Environment variables check',
    env: envCheck,
    timestamp: new Date().toISOString()
  });
}
