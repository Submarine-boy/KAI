import { supabase } from "./supabase.js";

const state = { approvals: [], executions: [], selected: null };
const $ = (s) => document.querySelector(s);

function toast(message) { const el = $("#toast"); el.textContent = message; el.classList.add("show"); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove("show"), 2600); }
function escapeText(value) { return String(value ?? "").replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }
function date(value) { return value ? new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(new Date(value)) : "—"; }
function status(value) { return `<span class="status ${escapeText(value)}">${escapeText(String(value || "").replaceAll("_"," "))}</span>`; }

async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No active session");
  const { data, error } = await supabase.rpc("is_kia_admin");
  if (error || data !== true) throw new Error("Operations access is restricted to authorized approvers.");
}

async function loadApprovals() {
  const filter = $("#approval-filter").value;
  let query = supabase.from("execution_approvals").select("id,execution_run_id,requested_by,reviewed_by,status,reason,requested_at,reviewed_at").order("requested_at", { ascending:false }).limit(100);
  if (filter !== "all") query = query.eq("status", filter);
  const { data, error } = await query;
  if (error) throw error;
  state.approvals = data || [];
  renderApprovals();
}

async function loadExecutions() {
  const { data, error } = await supabase.from("execution_runs").select("id,tool_name,status,permission_required,permission_granted,approval_required,approval_status,result,error,started_at,completed_at,created_at").order("created_at", { ascending:false }).limit(100);
  if (error) throw error;
  state.executions = data || [];
  renderExecutions();
}

function renderApprovals() {
  const list = $("#approval-list");
  list.innerHTML = state.approvals.map(a => `<article class="approval-card"><div class="approval-top"><div><p class="eyebrow">EXECUTION ${escapeText(a.execution_run_id?.slice(0,8) || "")}</p><h3>${escapeText(a.reason || "Execution approval requested")}</h3></div>${status(a.status)}</div><div class="approval-meta"><span>Requested ${escapeText(date(a.requested_at))}</span><span>Requester ${escapeText(a.requested_by?.slice(0,8) || "Unknown")}</span>${a.reviewed_at ? `<span>Reviewed ${escapeText(date(a.reviewed_at))}</span>` : ""}</div>${a.status === "pending" ? `<button class="primary review" data-id="${escapeText(a.id)}">Review</button>` : `<p class="muted">${escapeText(a.reason || "Reviewed")}</p>`}</article>`).join("");
  $("#approval-empty").hidden = state.approvals.length > 0;
  list.querySelectorAll(".review").forEach(b => b.addEventListener("click", () => openReview(b.dataset.id)));
}

function renderExecutions() {
  $("#execution-table").innerHTML = state.executions.map(e => `<tr><td><strong>${escapeText(e.tool_name)}</strong></td><td>${status(e.status)}</td><td>${escapeText(e.permission_required || "None")} ${e.permission_granted ? "✓" : "✕"}</td><td>${e.approval_required ? status(e.approval_status) : "Not required"}</td><td>${escapeText(date(e.started_at))}</td><td>${escapeText(date(e.completed_at))}</td></tr>`).join("");
  $("#execution-empty").hidden = state.executions.length > 0;
  $("#execution-count").textContent = state.executions.length;
  $("#pending-count").textContent = state.approvals.filter(a => a.status === "pending").length;
  $("#approved-count").textContent = state.approvals.filter(a => a.status === "approved").length;
  $("#rejected-count").textContent = state.approvals.filter(a => a.status === "rejected").length;
}

function openReview(id) {
  state.selected = state.approvals.find(a => a.id === id);
  if (!state.selected) return;
  $("#review-title").textContent = "Review execution request";
  $("#review-reason").textContent = `${state.selected.reason || "Approval requested."} · Execution ${state.selected.execution_run_id?.slice(0,8) || "—"}`;
  $("#review-note").value = "";
  $("#review-dialog").showModal();
}

async function executeApprovedRun(executionRunId) {
  const { data, error } = await supabase.functions.invoke("kia-execute", {
    body: {
      tool_name: "execution.record",
      execution_run_id: executionRunId,
      input: { execution_run_id: executionRunId }
    }
  });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || "Approved execution could not be completed.");
  return data;
}

async function review(statusValue) {
  if (!state.selected) return;
  const approvalId = state.selected.id;
  const executionRunId = state.selected.execution_run_id;
  const { data, error } = await supabase.rpc("kia_review_execution_approval", { p_approval_id: approvalId, p_status: statusValue, p_reason: $("#review-note").value.trim() || null });
  if (error) { toast(error.message); return; }
  $("#review-dialog").close(); state.selected = null;

  if (statusValue === "approved") {
    toast("Execution approved — completing execution");
    try {
      await executeApprovedRun(executionRunId);
      toast("Execution approved and completed");
    } catch (executionError) {
      console.error("Approved execution failed", executionError);
      toast(executionError.message || "Approval saved, but execution failed.");
    }
  } else {
    toast("Execution rejected");
  }

  await Promise.all([loadApprovals(), loadExecutions()]);
  console.log("Approval review", data);
}

async function refresh() {
  try { await getProfile(); await Promise.all([loadApprovals(), loadExecutions()]); }
  catch (error) { console.error(error); toast(error.message || "Operations could not be loaded."); }
}

$("#approval-filter").addEventListener("change", loadApprovals);
$("#refresh").addEventListener("click", refresh);
$("#close-review").addEventListener("click", () => $("#review-dialog").close());
$("#review-form").addEventListener("submit", e => { e.preventDefault(); review("approved"); });
$("#reject").addEventListener("click", () => review("rejected"));
$("#logout").addEventListener("click", async () => { await supabase.auth.signOut(); window.location.replace("login.html"); });
refresh();