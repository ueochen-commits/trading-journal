import React from 'react';
import { useLanguage } from '../LanguageContext';

// Keep this aligned with the working contact published on the website and in Creem.
// Switch to the branded mailbox only after routing and delivery are verified.
export default function BillingSupport() {
  const { language } = useLanguage();
  return <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 break-words">
    {language === 'cn' ? '付款、取消或退款需要帮助？联系 ' : 'Need help with payment, cancellation or a refund? Contact '}
    <a className="text-indigo-600 dark:text-indigo-300 underline underline-offset-2" href="mailto:ueochen@gmail.com">ueochen@gmail.com</a>
  </p>;
}
