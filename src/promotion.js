import { json, fail, bodyJson, safeText, validTxHash } from "./utils.js";
export async function promotionRoutes(request, env, user, url) {
  if (request.method === "GET" && url.pathname === "/api/promotions") {
    const rows = await env.DB.prepare("SELECT * FROM promotion_campaigns WHERE telegram_id=? ORDER BY id DESC LIMIT 50").bind(user.telegram_id).all();
    return json({ ok:true, campaigns:rows.results || [] });
  }
  if (request.method !== "POST" || url.pathname !== "/api/promotions") return fail("Not found.",404);
  const body = await bodyJson(request);
  const audience = body.audience === "unique" ? "unique" : "normal";
  const price = audience === "unique" ? Number(env.PROMO_UNIQUE_PRICE_USDT || 5) : Number(env.PROMO_NORMAL_PRICE_USDT || 2);
  const website = safeText(body.websiteUrl,500);
  let parsed;
  try { parsed = new URL(website); } catch { return fail("Enter a valid website URL."); }
  if (!["http:","https:"].includes(parsed.protocol)) return fail("Only HTTP/HTTPS URLs are allowed.");
  const tx = safeText(body.txHash,66);
  if (!validTxHash(tx)) return fail("Enter a valid BSC transaction hash.");
  try {
    await env.DB.prepare(`INSERT INTO promotion_campaigns (telegram_id,audience,website_url,amount_usdt,tx_hash)
      VALUES (?,?,?,?,?)`).bind(user.telegram_id,audience,parsed.toString(),price,tx).run();
  } catch { return fail("This transaction hash has already been submitted."); }
  return json({ ok:true, message:"Payment submitted. Campaign remains pending until independently verified by an admin." });
}
