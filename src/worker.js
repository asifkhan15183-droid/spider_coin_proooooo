import { json, fail, bodyJson, corsHeaders } from "./utils.js";
import { authenticate } from "./auth.js";
import { miningRoutes } from "./mining.js";
import { referralRoutes } from "./referral.js";
import { taskRoutes } from "./tasks.js";
import { walletRoutes } from "./wallet.js";
import { promotionRoutes } from "./promotion.js";
import { investorRoutes } from "./investor.js";
import { adminRoutes } from "./admin.js";
import { config } from "./config.js";

const rateBuckets = new Map();
function rateLimit(key, limit=60, windowMs=60000) {
  const now=Date.now(), item=rateBuckets.get(key);
  if(!item || now-item.start>windowMs) { rateBuckets.set(key,{start:now,count:1}); return true; }
  item.count++; return item.count<=limit;
}
async function profile(user, env) {
  const referrals=await env.DB.prepare("SELECT COUNT(*) total FROM referrals WHERE referrer_id=?").bind(user.telegram_id).first();
  const tasks=await env.DB.prepare("SELECT COUNT(*) total FROM task_claims WHERE telegram_id=? AND status='approved'").bind(user.telegram_id).first();
  return {ok:true,user:{telegramId:user.telegram_id,username:user.username,firstName:user.first_name,photoUrl:user.photo_url,
    referralCode:user.referral_code,balance:user.balance,totalEarned:user.total_earned,role:user.role,status:user.status,
    createdAt:user.created_at,referrals:referrals.total,tasksCompleted:tasks.total}};
}
async function route(request, env) {
  const url=new URL(request.url);
  if(url.pathname==="/api/health") return json({ok:true,service:"spider-coin",time:new Date().toISOString()});
  if(url.pathname==="/api/config" && request.method==="GET") {
    const c=config(env);
    return json({ok:true,projectName:c.projectName,coinName:c.coinName,coinSymbol:c.coinSymbol,botUsername:c.botUsername,
      miningRate:c.miningRate,miningCycleHours:c.miningCycleHours,withdrawalsEnabled:c.withdrawalsEnabled,
      promotion:{normal:c.normalPromoPrice,unique:c.uniquePromoPrice},supporterPrice:c.supporterPrice});
  }
  if(!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
  if(request.method==="OPTIONS") return new Response(null,{status:204});
  const ip=request.headers.get("cf-connecting-ip") || "unknown";
  if(!rateLimit(ip,120)) return fail("Too many requests. Try again later.",429);
  if(url.pathname==="/api/auth" && request.method==="POST") {
    try { const user=await authenticate(request,env); return json(await profile(user,env)); }
    catch(e) { return fail(e.message || "Authentication failed.",401); }
  }
  try {
    const user=await authenticate(request,env);
    const modules=[miningRoutes,referralRoutes,taskRoutes,walletRoutes,promotionRoutes,investorRoutes,adminRoutes];
    for(const handler of modules) {
      const result=await handler(request,env,user,url);
      if(result) {
        // Each module returns a 404 response for unknown routes; continue to the next module.
        if(result.status!==404) return result;
      }
    }
    if(url.pathname==="/api/profile" && request.method==="GET") return json(await profile(user,env));
    if(url.pathname==="/api/notifications" && request.method==="GET") {
      const rows=await env.DB.prepare("SELECT id,title,body,is_read,created_at FROM notifications WHERE telegram_id=? OR telegram_id IS NULL ORDER BY id DESC LIMIT 50").bind(user.telegram_id).all();
      return json({ok:true,notifications:rows.results||[]});
    }
    if(url.pathname==="/api/notifications/read" && request.method==="POST") {
      const body=await bodyJson(request);
      await env.DB.prepare("UPDATE notifications SET is_read=1 WHERE id=? AND (telegram_id=? OR telegram_id IS NULL)").bind(Number(body.id),user.telegram_id).run();
      return json({ok:true});
    }
    if(url.pathname==="/api/streak" && request.method==="GET") {
      const row=await env.DB.prepare("SELECT * FROM daily_streaks WHERE telegram_id=?").bind(user.telegram_id).first();
      return json({ok:true,streak:row||{day:0,last_claim_date:null}});
    }
    if(url.pathname==="/api/streak/claim" && request.method==="POST") {
      const today=new Date().toISOString().slice(0,10);
      const row=await env.DB.prepare("SELECT * FROM daily_streaks WHERE telegram_id=?").bind(user.telegram_id).first();
      if(row?.last_claim_date===today) return fail("Today's bonus already claimed.");
      const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
      const day=row?.last_claim_date===yesterday ? Math.min(21,(row.day||0)+1) : 1;
      const reward=day*10;
      await env.DB.batch([
        env.DB.prepare("INSERT INTO daily_streaks(telegram_id,day,last_claim_date) VALUES(?,?,?) ON CONFLICT(telegram_id) DO UPDATE SET day=excluded.day,last_claim_date=excluded.last_claim_date").bind(user.telegram_id,day,today),
        env.DB.prepare("UPDATE users SET balance=balance+?,total_earned=total_earned+? WHERE telegram_id=?").bind(reward,reward,user.telegram_id),
        env.DB.prepare("INSERT INTO transactions(telegram_id,type,amount,reference) VALUES(?,'daily_bonus',?,?)").bind(user.telegram_id,reward,`streak_${user.telegram_id}_${today}`)
      ]);
      return json({ok:true,day,reward});
    }
    return fail("API route not found.",404);
  } catch(e) { return fail(e.message||"Request failed.",400); }
}
export default {
  async fetch(request,env) {
    const origin=request.headers.get("origin")||"*";
    const response=await route(request,env);
    const headers=new Headers(response.headers);
    for(const [k,v] of Object.entries(corsHeaders(origin,env))) headers.set(k,v);
    headers.set("x-content-type-options","nosniff");
    headers.set("x-frame-options","DENY");
    headers.set("referrer-policy","strict-origin-when-cross-origin");
    headers.set("content-security-policy","default-src 'self' https://telegram.org; script-src 'self' https://telegram.org 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none';");
    return new Response(response.body,{status:response.status,headers});
  }
};
