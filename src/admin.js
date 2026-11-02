import { json, fail, bodyJson, safeText, validTxHash } from "./utils.js";

function admins(env) { return new Set(String(env.ADMIN_IDS || "").split(",").map(x=>x.trim()).filter(Boolean)); }
async function audit(env, admin, action, target, details={}) {
  await env.DB.prepare("INSERT INTO audit_logs (admin_id,action,target_id,details) VALUES (?,?,?,?)")
    .bind(admin,action,target,JSON.stringify(details)).run();
}
export async function adminRoutes(request, env, user, url) {
  if (!admins(env).has(String(user.telegram_id))) return fail("Admin access denied.",403);
  if (request.method === "GET" && url.pathname === "/api/admin/overview") {
    const queries = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) total FROM users").first(),
      env.DB.prepare("SELECT COUNT(*) total FROM users WHERE last_seen_at >= datetime('now','-1 day')").first(),
      env.DB.prepare("SELECT COALESCE(SUM(amount),0) total FROM transactions WHERE amount>0").first(),
      env.DB.prepare("SELECT COUNT(*) total FROM task_claims WHERE status='pending'").first(),
      env.DB.prepare("SELECT COUNT(*) total FROM withdrawals WHERE status='pending'").first(),
      env.DB.prepare("SELECT COUNT(*) total FROM promotion_campaigns WHERE payment_status='pending'").first()
    ]);
    return json({ok:true,users:queries[0].total,active24h:queries[1].total,coinsDistributed:queries[2].total,pendingTasks:queries[3].total,pendingWithdrawals:queries[4].total,pendingPromotions:queries[5].total});
  }
  if (request.method === "GET" && url.pathname === "/api/admin/users") {
    const rows = await env.DB.prepare("SELECT telegram_id,username,first_name,balance,total_earned,status,created_at FROM users ORDER BY created_at DESC LIMIT 200").all();
    return json({ok:true,users:rows.results || []});
  }
  if (request.method !== "POST") return fail("Method not allowed.",405);
  const body = await bodyJson(request);
  if (url.pathname === "/api/admin/tasks") {
    const title=safeText(body.title,120), reward=Number(body.reward), type=safeText(body.type,40);
    if (!title || !Number.isFinite(reward) || reward<0) return fail("Task title and valid reward are required.");
    await env.DB.prepare("INSERT INTO tasks (title,description,type,target_url,reward,frequency,verification_mode) VALUES (?,?,?,?,?,?,?)")
      .bind(title,safeText(body.description,500),type,safeText(body.targetUrl,500),reward,body.frequency==="daily"?"daily":"once","manual").run();
    await audit(env,user.telegram_id,"task.create",null,{title,reward});
    return json({ok:true});
  }
  if (url.pathname === "/api/admin/task-review") {
    const id=Number(body.claimId), decision=body.decision==="approve"?"approved":"rejected";
    const claim=await env.DB.prepare("SELECT c.*,t.reward FROM task_claims c JOIN tasks t ON t.id=c.task_id WHERE c.id=? AND c.status='pending'").bind(id).first();
    if(!claim) return fail("Pending task claim not found.",404);
    const stmts=[env.DB.prepare("UPDATE task_claims SET status=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'").bind(decision,id)];
    if(decision==="approved") {
      stmts.push(env.DB.prepare("UPDATE users SET balance=balance+?,total_earned=total_earned+? WHERE telegram_id=?").bind(claim.reward,claim.reward,claim.telegram_id));
      stmts.push(env.DB.prepare("INSERT INTO transactions (telegram_id,type,amount,reference) VALUES (?,'task',?,?)").bind(claim.telegram_id,claim.reward,`task_${id}`));
    }
    await env.DB.batch(stmts); await audit(env,user.telegram_id,"task.review",claim.telegram_id,{id,decision});
    return json({ok:true});
  }
  if (url.pathname === "/api/admin/withdrawal-review") {
    const id=Number(body.withdrawalId), decision=body.decision==="approve"?"approved":"rejected";
    const w=await env.DB.prepare("SELECT * FROM withdrawals WHERE id=? AND status='pending'").bind(id).first();
    if(!w) return fail("Pending withdrawal not found.",404);
    const tx=safeText(body.txHash,66);
    if(decision==="approved" && tx && !validTxHash(tx)) return fail("Invalid transaction hash.");
    const statements=[env.DB.prepare("UPDATE withdrawals SET status=?,tx_hash=?,admin_note=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'")
      .bind(decision,tx||null,safeText(body.note,300),id)];
    if(decision==="rejected") statements.push(env.DB.prepare("UPDATE users SET balance=balance+? WHERE telegram_id=?").bind(w.amount,w.telegram_id));
    await env.DB.batch(statements); await audit(env,user.telegram_id,"withdrawal.review",w.telegram_id,{id,decision});
    return json({ok:true});
  }
  if (url.pathname === "/api/admin/user-adjust") {
    const target=safeText(body.telegramId,30), amount=Number(body.amount);
    if(!target || !Number.isFinite(amount) || amount===0) return fail("Invalid target or amount.");
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET balance=balance+?,total_earned=MAX(0,total_earned+?) WHERE telegram_id=?").bind(amount,Math.max(0,amount),target),
      env.DB.prepare("INSERT INTO transactions (telegram_id,type,amount,reference,metadata) VALUES (?,'admin_adjustment',?,?,?)").bind(target,amount,`admin_${Date.now()}_${target}`,JSON.stringify({admin:user.telegram_id}))
    ]);
    await audit(env,user.telegram_id,"user.balance.adjust",target,{amount});
    return json({ok:true});
  }
  if (url.pathname === "/api/admin/user-status") {
    const target=safeText(body.telegramId,30), status=body.status==="banned"?"banned":"active";
    await env.DB.prepare("UPDATE users SET status=? WHERE telegram_id=?").bind(status,target).run();
    await audit(env,user.telegram_id,"user.status",target,{status});
    return json({ok:true});
  }
  if (url.pathname === "/api/admin/promotion-review") {
    const id=Number(body.campaignId), decision=body.decision==="verified"?"verified":"rejected";
    const row=await env.DB.prepare("SELECT * FROM promotion_campaigns WHERE id=? AND payment_status='pending'").bind(id).first();
    if(!row) return fail("Pending campaign not found.",404);
    // Hash submission is NOT proof of payment. This action records a human verification only.
    await env.DB.prepare("UPDATE promotion_campaigns SET payment_status=?,campaign_status=? WHERE id=? AND payment_status='pending'")
      .bind(decision,decision==="verified"?"active":"rejected",id).run();
    await audit(env,user.telegram_id,"promotion.review",row.telegram_id,{id,decision});
    return json({ok:true});
  }
  if (url.pathname === "/api/admin/bot-settings") {
    const botUsername=safeText(body.botUsername,64).replace(/^@/,"");
    const miniAppUrl=safeText(body.miniAppUrl,500);
    if(botUsername && !/^[A-Za-z0-9_]{5,32}$/.test(botUsername)) return fail("Invalid bot username.");
    if(miniAppUrl && !/^https:\/\/[^\s]+$/.test(miniAppUrl)) return fail("Mini App URL must use HTTPS.");
    // Bot token is intentionally not accepted or returned through this endpoint. Set it as a Worker secret.
    for(const [key,value] of [["BOT_USERNAME",botUsername],["MINI_APP_URL",miniAppUrl]]) {
      await env.DB.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP").bind(key,value).run();
    }
    await audit(env,user.telegram_id,"bot.settings.update",null,{botUsername,miniAppUrl});
    return json({ok:true,tokenConfigured:!!env.TELEGRAM_BOT_TOKEN});
  }
  return fail("Admin route not found.",404);
}
