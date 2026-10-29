import React from 'react';
import { useLanguage } from '../LanguageContext';
export default function AiUseNotice() {
 const {language}=useLanguage();const cn=language==='cn';
 return <p className="mt-3 text-xs leading-5 text-[var(--tg-secondary)]">{cn?'AI 请求和生成结果禁止 NSFW、色情及性暗示内容。':'NSFW, sexually explicit and sexually suggestive content is prohibited in AI requests and generated output.'} <a className="underline text-[var(--tg-accent)]" href={`https://www.tradegrail.net${cn?'':'/en'}/acceptable-use`} target="_blank" rel="noopener noreferrer">{cn?'可接受使用政策':'Acceptable Use Policy'}</a></p>;
}
