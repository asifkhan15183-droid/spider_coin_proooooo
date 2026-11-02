(() => {
  const tg = window.Telegram?.WebApp;
  tg?.ready(); tg?.expand();
  const $ = id => document.getElementById(id);
  let initData = tg?.initData || "";
  let me = null, mining = null, config = {};
  const api = async (path, method="GET", body) => {
    const res = await fetch(path,{method,headers:{"content-type":"application/json","x-telegram-init-data":initData},body:body?JSON.stringify(body):undefined});
    const data=await res.json().catch(()=>({ok:false,error:"Invalid server response"}));
    if(!res.ok || data.ok===false) throw new Error(data.error||"Request failed");
    return data;
  };
  function notice(message){$("notice").textContent=message;$("notice").classList.remove("hidden");setTimeout(()=>$("notice").classList.add("hidden"),5000)}
  function money(n){return Number(n||0).toFixed(6)}
  function showPage(name){
    document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.id===`page-${name}`));
    document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===name));
    if(name==="refer") loadReferrals(); if(name==="task") loadTasks(); if(name==="wallet") loadWallet(); if(name==="mining") loadMining(); if(name==="admin") loadAdmin();
  }
  document.querySelectorAll(".nav").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
  async function loadProfile(){
    const d=await api("/api/profile");me=d.user;
    $("balance").textContent=money(me.balance);$("headerBalance").textContent=`${money(me.balance)} ${config.coinSymbol||"SPC"}`;
    $("refCount").textContent=me.referrals;$("taskCount").textContent=me.tasksCompleted;$("walletBalance").textContent=`${money(me.balance)} SPC`;
    $("profileName").textContent=me.firstName||me.username||"Telegram member";$("telegramId").textContent=`Telegram ID: ${me.telegramId}`;
    if(me.photoUrl)$("avatar").src=me.photoUrl;
    if(me.role==="admin")document.querySelectorAll(".admin-only").forEach(x=>x.classList.remove("hidden"));
  }
  async function loadReferrals(){
    const d=await api("/api/referrals");$("refLink").value=d.link||"Set BOT_USERNAME in Worker configuration";
    $("refTotal").textContent=`${d.count} referrals`;
    $("referralsList").innerHTML=(d.referrals||[]).map(r=>`<div class="list-item"><span>${escapeHtml(r.first_name||r.username||"Member")}<small>${r.created_at}</small></span><b>+${r.reward} SPC</b></div>`).join("")||"<p class='muted'>No referrals yet.</p>";
  }
  async function loadTasks(){
    const d=await api("/api/tasks");$("tasksList").innerHTML=(d.tasks||[]).map(t=>`<div class="list-item"><div><b>${escapeHtml(t.title)}</b><small>${escapeHtml(t.description||"")} · ${t.reward} SPC · ${escapeHtml(t.frequency)}</small></div>${t.claim_status?`<small>${escapeHtml(t.claim_status)}</small>`:`<button class="secondary" data-task="${t.id}">Submit</button>`}</div>`).join("")||"<p class='muted'>No active tasks.</p>";
    $("tasksList").querySelectorAll("[data-task]").forEach(b=>b.addEventListener("click",async()=>{try{await api("/api/tasks/claim","POST",{taskId:Number(b.dataset.task)});notice("Task submitted for manual review.");loadTasks()}catch(e){notice(e.message)}}));
  }
  async function loadMining(){
    mining=await api("/api/mining");const active=mining.active;
    $("mineStatus").textContent=active?"Mining cycle is active. Claim becomes available when the cycle ends.":"Start a 24-hour mining cycle.";
    $("miningState").textContent=active?"Mining active":"Mining is not active";
    $("startMine").disabled=active;$("dashboardMine").textContent=active?"Mining active":"Start mining";
    $("claimMine").disabled=!active || Date.now()/1000<mining.endsAt;
    updateCounter();
  }
  function updateCounter(){
    if(!mining?.active){$("mineCounter").textContent="0.000000 SPC";$("liveCounter").textContent="0.000000 SPC";return}
    const elapsed=Math.max(0,Math.min(Date.now()/1000-mining.startedAt,mining.endsAt-mining.startedAt));
    const value=elapsed/3600*mining.rate;
    $("mineCounter").textContent=`${money(value)} SPC`;$("liveCounter").textContent=`${money(value)} SPC`;
    $("claimMine").disabled=Date.now()/1000<mining.endsAt;
  }
  async function loadWallet(){
    const d=await api("/api/wallet");$("walletBalance").textContent=`${money(d.balance)} SPC`;
    $("withdrawBtn").disabled=!d.withdrawalsEnabled;$("withdrawNotice").textContent=d.withdrawalsEnabled?"Requests are manually reviewed by the admin.":"Withdrawals are currently disabled by the project owner.";
    $("transactionsList").innerHTML=(d.transactions||[]).map(t=>`<div class="list-item"><span>${escapeHtml(t.type)}<small>${t.created_at}</small></span><b>${t.amount} SPC</b></div>`).join("")||"<p class='muted'>No transactions yet.</p>";
  }
  async function loadAdmin(){
    try{
      const d=await api("/api/admin/overview");
      $("adminStats").innerHTML=[["Users",d.users],["Active 24h",d.active24h],["Coins distributed",money(d.coinsDistributed)],["Pending tasks",d.pendingTasks],["Pending withdrawals",d.pendingWithdrawals],["Pending promotions",d.pendingPromotions]].map(x=>`<article class="panel"><small>${x[0]}</small><strong>${x[1]}</strong></article>`).join("");
      $("botUsername").value=config.botUsername||"";$("miniAppUrl").value="";
    }catch(e){notice(e.message)}
  }
  function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  $("copyRef").onclick=async()=>{try{await navigator.clipboard.writeText($("refLink").value);notice("Referral link copied.")}catch{notice("Copy is not available in this browser.")}};
  $("startMine").onclick=$("dashboardMine").onclick=async()=>{try{await api("/api/mining/start","POST",{});await loadMining();notice("Mining started.")}catch(e){notice(e.message)}};
  $("claimMine").onclick=async()=>{try{const d=await api("/api/mining/claim","POST",{});notice(`Claimed ${d.reward} SPC`);await loadProfile();await loadMining()}catch(e){notice(e.message)}};
  $("dailyClaim").onclick=async()=>{try{const d=await api("/api/streak/claim","POST",{});notice(`Day ${d.day}: +${d.reward} SPC`);$("streakInfo").textContent=`Current streak: day ${d.day}`;await loadProfile()}catch(e){notice(e.message)}};
  $("submitPromo").onclick=async()=>{try{await api("/api/promotions","POST",{audience:$("promoAudience").value,websiteUrl:$("promoUrl").value,txHash:$("promoHash").value});notice("Campaign submitted for payment review.")}catch(e){notice(e.message)}};
  $("withdrawBtn").onclick=async()=>{try{await api("/api/wallet/withdraw","POST",{amount:Number($("withdrawAmount").value),address:$("withdrawAddress").value});notice("Withdrawal submitted.");loadWallet();loadProfile()}catch(e){notice(e.message)}};
  $("supportSubmit").onclick=async()=>{try{await api("/api/investor/pass","POST",{txHash:$("supportHash").value});notice("Supporter Pass submitted for review.")}catch(e){notice(e.message)}};
  $("createTask").onclick=async()=>{try{await api("/api/admin/tasks","POST",{title:$("newTaskTitle").value,reward:Number($("newTaskReward").value),targetUrl:$("newTaskUrl").value});notice("Task created.");loadAdmin()}catch(e){notice(e.message)}};
  $("saveBot").onclick=async()=>{try{await api("/api/admin/bot-settings","POST",{botUsername:$("botUsername").value,miniAppUrl:$("miniAppUrl").value});notice("Bot settings saved. Set token separately as a Worker secret.");config.botUsername=$("botUsername").value;loadReferrals()}catch(e){notice(e.message)}};
  $("approveWithdrawal").onclick=()=>reviewWithdrawal("approve");$("rejectWithdrawal").onclick=()=>reviewWithdrawal("reject");
  async function reviewWithdrawal(decision){try{await api("/api/admin/withdrawal-review","POST",{withdrawalId:Number($("reviewWithdrawalId").value),decision,txHash:$("reviewTx").value});notice("Withdrawal review saved.");loadAdmin()}catch(e){notice(e.message)}}
  $("adjustBalance").onclick=async()=>{try{await api("/api/admin/user-adjust","POST",{telegramId:$("adjustUser").value,amount:Number($("adjustAmount").value)});notice("Balance adjusted.");loadAdmin()}catch(e){notice(e.message)}};
  async function init(){
    try{
      config=await api("/api/config");
      $("projectName").textContent=config.projectName.toUpperCase();
      if(!initData){throw new Error("Open this app from its Telegram bot. Browser preview has no Telegram authentication data.")}
      await api("/api/auth","POST",{});await loadProfile();await loadMining();
      const s=await api("/api/streak");$("streakInfo").textContent=`Current streak: day ${s.streak.day||0}`;
      $("loading").classList.add("hidden");setInterval(updateCounter,250);
    }catch(e){$("loading").classList.add("hidden");notice(e.message);$("profileName").textContent="Authentication required";}
  }
  init();
})();
