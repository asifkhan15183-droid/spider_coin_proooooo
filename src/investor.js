import { json, fail, bodyJson, safeText, validTxHash } from "./utils.js";
export async function investorRoutes(request, env, user, url) {
  if (request.method === "GET" && url.pathname === "/api/investor") {
    const pass = await env.DB.prepare("SELECT status,purchased_at FROM supporter_passes WHERE telegram_id=?").bind(user.telegram_id).first();
    return json({ ok:true, price:Number(env.SUPPORTER_PASS_PRICE_USDT || 5), pass:pass || null,
      allocation:[{name:"Investors",value:10},{name:"Team",value:15},{name:"Marketing",value:5},{name:"Developer",value:10},{name:"Community Members",value:60}],
      disclaimer:"Supporter Pass is a badge product only. It does not represent company ownership or guarantee profit." });
  }
  if (request.method !== "POST" || url.pathname !== "/api/investor/pass") return fail("Not found.",404);
  const body = await bodyJson(request), tx = safeText(body.txHash,66);
  if (!validTxHash(tx)) return fail("Enter a valid BSC transaction hash.");
  try {
    await env.DB.prepare("INSERT INTO supporter_passes (telegram_id,tx_hash) VALUES (?,?)").bind(user.telegram_id,tx).run();
  } catch { return fail("Pass request or transaction already exists."); }
  return json({ ok:true, message:"Pass payment submitted for admin verification." });
}
