import { json, fail, bodyJson, safeText } from "./utils.js";
export async function taskRoutes(request, env, user, url) {
  if (request.method === "GET" && url.pathname === "/api/tasks") {
    const tasks = await env.DB.prepare(`SELECT t.*,c.status AS claim_status FROM tasks t
      LEFT JOIN task_claims c ON c.task_id=t.id AND c.telegram_id=?
      WHERE t.is_active=1 ORDER BY t.id DESC`).bind(user.telegram_id).all();
    return json({ ok:true, tasks:tasks.results || [] });
  }
  if (request.method !== "POST" || url.pathname !== "/api/tasks/claim") return fail("Not found.",404);
  const body = await bodyJson(request), id = Number(body.taskId);
  if (!Number.isInteger(id) || id < 1) return fail("Invalid task.");
  const task = await env.DB.prepare("SELECT * FROM tasks WHERE id=? AND is_active=1").bind(id).first();
  if (!task) return fail("Task not found.",404);
  if (task.verification_mode !== "manual") return fail("This task requires an admin verification workflow.");
  const existing = await env.DB.prepare("SELECT id FROM task_claims WHERE task_id=? AND telegram_id=?").bind(id,user.telegram_id).first();
  if (existing) return fail("Task already submitted.");
  await env.DB.prepare("INSERT INTO task_claims (task_id,telegram_id,status) VALUES (?,?,'pending')").bind(id,user.telegram_id).run();
  return json({ ok:true, message:"Submitted for manual review." });
}
