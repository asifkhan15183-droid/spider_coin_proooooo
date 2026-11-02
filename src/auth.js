import { json, fail, randomCode } from "./utils.js";

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
async function hmac(key, data) {
  const cryptoKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data)));
}
function hex(bytes) { return [...bytes].map(x => x.toString(16).padStart(2, "0")).join(""); }

export async function verifyTelegramInitData(initData, botToken, maxAgeSeconds = 86400) {
  if (!initData || !botToken) throw new Error("Telegram authentication is not configured.");
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  if (!receivedHash) throw new Error("Missing Telegram signature.");
  params.delete("hash");
  const dataCheckString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`).join("\n");
  const secretKey = await hmac("WebAppData", botToken);
  const key = await crypto.subtle.importKey("raw", secretKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const calculated = hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(dataCheckString))));
  if (!constantTimeEqual(calculated, receivedHash)) throw new Error("Invalid Telegram signature.");
  const authDate = Number(params.get("auth_date") || 0);
  if (!authDate || Math.abs(Math.floor(Date.now() / 1000) - authDate) > maxAgeSeconds) {
    throw new Error("Telegram login has expired. Reopen the Mini App.");
  }
  const user = JSON.parse(params.get("user") || "null");
  if (!user?.id) throw new Error("Telegram user information is missing.");
  return user;
}

export async function authenticate(request, env) {
  const initData = request.headers.get("x-telegram-init-data") || "";
  const user = await verifyTelegramInitData(initData, env.TELEGRAM_BOT_TOKEN);
  const telegramId = String(user.id);
  const existing = await env.DB.prepare("SELECT * FROM users WHERE telegram_id = ?").bind(telegramId).first();
  if (existing?.status === "banned") throw new Error("This account is restricted.");
  if (!existing) {
    const startParam = new URLSearchParams(initData).get("start_param") || "";
    const referrer = startParam.replace(/^ref_/, "");
    const code = randomCode();
    await env.DB.prepare(`INSERT INTO users (telegram_id, username, first_name, last_name, photo_url, referral_code, referred_by, last_seen_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(telegramId, user.username || null, user.first_name || null, user.last_name || null,
        user.photo_url || null, code, referrer || null).run();
    if (referrer && referrer !== telegramId) {
      const refUser = await env.DB.prepare("SELECT telegram_id FROM users WHERE referral_code = ?").bind(referrer).first();
      if (refUser && refUser.telegram_id !== telegramId) {
        const reward = Number(env.REFERRAL_REWARD || 100);
        await env.DB.batch([
          env.DB.prepare("INSERT OR IGNORE INTO referrals (referrer_id, referred_id, reward) VALUES (?, ?, ?)")
            .bind(refUser.telegram_id, telegramId, reward),
          env.DB.prepare("UPDATE users SET balance = balance + ?, total_earned = total_earned + ? WHERE telegram_id = ?")
            .bind(reward, reward, refUser.telegram_id),
          env.DB.prepare("INSERT INTO transactions (telegram_id,type,amount,reference,metadata) VALUES (?,'referral',?,?,?)")
            .bind(refUser.telegram_id, reward, `ref_${telegramId}`, JSON.stringify({ referred: telegramId }))
        ]);
      }
    }
  } else {
    await env.DB.prepare("UPDATE users SET username=?, first_name=?, last_name=?, photo_url=?, last_seen_at=CURRENT_TIMESTAMP WHERE telegram_id=?")
      .bind(user.username || null, user.first_name || null, user.last_name || null, user.photo_url || null, telegramId).run();
  }
  const adminIds = new Set(String(env.ADMIN_IDS || "").split(",").map(x => x.trim()).filter(Boolean));
  const role = adminIds.has(telegramId) ? "admin" : "user";
  await env.DB.prepare("UPDATE users SET role=? WHERE telegram_id=?").bind(role, telegramId).run();
  const fresh = await env.DB.prepare("SELECT * FROM users WHERE telegram_id=?").bind(telegramId).first();
  return { ...fresh, telegramUser: user };
}
