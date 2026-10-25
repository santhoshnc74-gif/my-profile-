export async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {credentials:'same-origin', signal:AbortSignal.timeout(15000), ...options});
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Something went wrong. Please try again.');
  return body as T;
}
export function safeUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined; } catch { return undefined; }
}
