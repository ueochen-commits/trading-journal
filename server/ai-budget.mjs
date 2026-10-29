// Bound billable context independently of client input. Preserve both instructions and
// the end of long content; the marker makes omitted context explicit to the model.
function excerpt(content, maxBytes) {
  const bytes = Buffer.from(String(content ?? ''), 'utf8');
  if (bytes.length <= maxBytes) return bytes.toString('utf8');
  const marker = '\n[Context shortened for this request]\n';
  const side = Math.floor((maxBytes - Buffer.byteLength(marker) - 8) / 2);
  return bytes.subarray(0, side).toString('utf8') + marker + bytes.subarray(-side).toString('utf8');
}
export function limitAiMessages(messages) {
  const input = messages.slice(-10);
  const perMessage = Math.floor(12000 / Math.max(1,input.length));
  return input.map(message => ({ role: ['system','user','assistant'].includes(message.role) ? message.role : 'user', content: excerpt(message.content, perMessage) }));
}
