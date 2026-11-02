import { json, fail, nowSeconds } from "./utils.js";
export async function miningRoutes(request, env, user, url) {
  if (request.method === "GET" && url.pathname === "/api/mining") {
    const session = await env.DB.prepare("SELECT * FROM mining_sessions WHERE telegram_id=? AND status='active' ORDER BY id DESC LIMIT 1").bind(user.telegram_id).first();
    if (!session) return json({ ok: true, active: false, accrued: 0, rate: Number(env.MINING_RATE_PER_HOUR || 1) });
    const elapsed = Math.max(0, Math.min(nowSeconds() - session.started_at, session.cycle_seconds));
    return json({ ok: true, active: true, startedAt: session.started_at, endsAt: session.started_at + session.cycle_seconds,
      accrued: Math.max(0, elapsed / 3600 * session.rate_per_hour), rate: session.rate_per_hour });
  }
  if (request.method !== "POST") return fail("Method not allowed.", 405);
  if (url.pathname === "/api/mining/start") {
    const current = await env.DB.prepare("SELECT id FROM mining_sessions WHERE telegram_id=? AND status='active'").bind(user.telegram_id).first();
    if (current) return fail("Mining is already active.");
    await env.DB.prepare("INSERT INTO mining_sessions (telegram_id,started_at,rate_per_hour,cycle_seconds) VALUES (?,?,?,?)")
      .bind(user.telegram_id, nowSeconds(), Number(env.MINING_RATE_PER_HOUR || 1), Number(env.MINING_CYCLE_HOURS || 24) * 3600).run();
    return json({ ok: true });
  }
  if (url.pathname === "/api/mining/claim") {
    const session = await env.DB.prepare("SELECT * FROM mining_sessions WHERE telegram_id=? AND status='active' ORDER BY id DESC LIMIT 1").bind(user.telegram_id).first();
    if (!session) return fail("No active mining session.");
    const elapsed = Math.max(0, Math.min(nowSeconds() - session.started_at, session.cycle_seconds));
    if (elapsed < session.cycle_seconds) return fail("Mining cycle has not finished yet.");
    const reward = Number((elapsed / 3600 * session.rate_per_hour).toFixed(8));
    await env.DB.batch([
      env.DB.prepare("UPDATE mining_sessions SET status='claimed',claimed_at=? WHERE id=? AND status='active'").bind(nowSeconds(), session.id),
      env.DB.prepare("UPDATE users SET balance=balance+?,total_earned=total_earned+? WHERE telegram_id=?").bind(reward,reward,user.telegram_id),
      env.DB.prepare("INSERT INTO transactions (telegram_id,type,amount,reference) VALUES (?,'mining',?,?)").bind(user.telegram_id,reward,`mine_${session.id}`)
    ]);
    return json({ ok: true, reward });
  }
  return fail("Not found.", 404);
}
