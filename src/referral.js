import { json, fail } from "./utils.js";
export async function referralRoutes(request, env, user, url) {
  if (request.method !== "GET" || url.pathname !== "/api/referrals") return fail("Not found.",404);
  const rows = await env.DB.prepare(`SELECT u.username,u.first_name,r.reward,r.created_at
    FROM referrals r JOIN users u ON u.telegram_id=r.referred_id
    WHERE r.referrer_id=? ORDER BY r.created_at DESC LIMIT 100`).bind(user.telegram_id).all();
  const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM referrals WHERE referrer_id=?").bind(user.telegram_id).first();
  const code = user.referral_code;
  const bot = (env.BOT_USERNAME || "").replace(/^@/,"");
  return json({ ok:true, count:count.total, referrals:rows.results || [], code,
    link: bot ? `https://t.me/${bot}?start=ref_${code}` : null });
}
