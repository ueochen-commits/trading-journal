// Ordinary AI availability failures may fall back; a policy rejection must not.
export async function csvRulesWithFallback(request, fallback) {
 try {
  const response=await request();const result=await response.json();
  if(result?.error==='AI_CONTENT_NOT_ALLOWED')throw Object.assign(new Error('文件或生成结果违反 AI 可接受使用政策，已停止解析。请移除违规内容后重试。'),{code:'AI_CONTENT_NOT_ALLOWED'});
  if(!response.ok)throw Error('AI API error');
  return result;
 }catch(error){if(error?.code==='AI_CONTENT_NOT_ALLOWED')throw error;return fallback();}
}
