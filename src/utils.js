export const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
export const fail = (message, status = 400) => json({ ok: false, error: message }, status);
export const nowSeconds = () => Math.floor(Date.now() / 1000);
export function randomCode(length = 9) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map(b => chars[b % chars.length]).join("");
}
export function validAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || ""));
}
export function validTxHash(value) {
  return /^0x[a-fA-F0-9]{64}$/.test(String(value || ""));
}
export function safeText(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}
export async function bodyJson(request) {
  try { return await request.json(); } catch { return {}; }
}
export function corsHeaders(origin, env) {
  const allowed = env.APP_ORIGIN || origin || "*";
  return {
    "access-control-allow-origin": allowed,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
    "vary": "Origin"
  };
}
