import { json, fail, bodyJson, safeText, validAddress } from "./utils.js";
export async function walletRoutes(request, env, user, url) {
  if (request.method === "GET" && url.pathname === "/api/wallet") {
    const tx = await env.DB.prepare("SELECT type,amount,status,reference,created_at FROM transactions WHERE telegram_id=? ORDER BY id DESC LIMIT 50").bind(user.telegram_id).all();
    const withdrawals = await env.DB.prepare("SELECT id,amount,wallet_address,status,tx_hash,created_at FROM withdrawals WHERE telegram_id=? ORDER BY id DESC LIMIT 30").bind(user.telegram_id).all();
    return json({ ok:true, balance:user.balance, transactions:tx.results || [], withdrawals:withdrawals.results || [], withdrawalsEnabled:env.WITHDRAWALS_ENABLED==="true" });
  }
  if (request.method !== "POST" || url.pathname !== "/api/wallet/withdraw") return fail("Not found.",404);
  if (env.WITHDRAWALS_ENABLED !== "true") return fail("Withdrawals are currently disabled.");
  const body = await bodyJson(request), amount = Number(body.amount), address = safeText(body.address,42);
  if (!Number.isFinite(amount) || amount <= 0 || !validAddress(address)) return fail("Enter a valid amount and BEP20 address.");
  const current = await env.DB.prepare("SELECT balance FROM users WHERE telegram_id=?").bind(user.telegram_id).first();
  if (amount > current.balance) return fail("Insufficient balance.");
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET balance=balance-? WHERE telegram_id=? AND balance>=?").bind(amount,user.telegram_id,amount),
    env.DB.prepare("INSERT INTO withdrawals (telegram_id,amount,wallet_address) VALUES (?,?,?)").bind(user.telegram_id,amount,address),
    env.DB.prepare("INSERT INTO transactions (telegram_id,type,amount,status,reference) VALUES (?,'withdrawal',?,'pending',?)").bind(user.telegram_id,-amount,`withdraw_${user.telegram_id}_${Date.now()}`)
  ]);
  return json({ ok:true, message:"Withdrawal request submitted for admin review." });
}
