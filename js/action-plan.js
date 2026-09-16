let pendingActionPlan = null;

const planStyles = {
    card: "margin:12px auto 18px;max-width:760px;padding:14px 16px;border:1px solid rgba(6,182,212,.24);border-radius:14px;background:linear-gradient(135deg,rgba(17,24,39,.92),rgba(22,32,51,.72));box-shadow:0 10px 30px rgba(0,0,0,.18);",
    header: "display:flex;align-items:center;gap:10px;margin-bottom:10px;",
    icon: "width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:9px;background:rgba(6,182,212,.1);color:#06b6d4;font-weight:700;",
    title: "font-size:13px;font-weight:700;color:#f8fafc;",
    subtitle: "font-size:11px;color:#778196;margin-top:2px;",
    row: "display:flex;flex-wrap:wrap;gap:7px;margin-top:10px;",
    chip: "display:inline-flex;align-items:center;padding:5px 8px;border-radius:7px;background:rgba(37,99,235,.1);color:#a7b0c0;font-size:11px;",
    warning: "margin-top:10px;padding:9px 10px;border-radius:8px;background:rgba(245,185,66,.08);color:#cbd5e1;font-size:11px;line-height:1.5;"
};

function escapeHTML(value) {
    const element = document.createElement("div");
    element.textContent = String(value ?? "");
    return element.innerHTML;
}

function describePlan(plan) {
    if (!plan || plan.planned !== true) return null;

    const tool = plan.tool_name || "internal action";
    const input = plan.input || {};
    const missing = Array.isArray(plan.missing_fields) ? plan.missing_fields : [];
    const ready = plan.execution_ready === true;
    const requiresApproval = plan.requires_approval === true;

    const labels = {
        "project.task.create": "Create task",
        "project.task.update": "Update task",
        "project.task.assign": "Assign task"
    };

    const details = [];
    if (input.project_name) details.push(`Project: ${input.project_name}`);
    if (input.title) details.push(`Task: ${input.title}`);
    if (input.task_title) details.push(`Task: ${input.task_title}`);
    if (input.assignee_name) details.push(`Assignee: ${input.assignee_name}`);
    if (input.status) details.push(`Status: ${input.status}`);

    const card = document.createElement("section");
    card.className = "kia-action-plan";
    card.dataset.decisionId = plan.decision_id || "";
    card.style.cssText = planStyles.card;

    card.innerHTML = `
        <div style="${planStyles.header}">
            <div style="${planStyles.icon}">↗</div>
            <div>
                <div style="${planStyles.title}">Action plan · ${escapeHTML(labels[tool] || tool)}</div>
                <div style="${planStyles.subtitle}">${ready ? "Verified and ready for the approval gate" : "Planned, but more information is required"}</div>
            </div>
        </div>
        ${details.length ? `<div style="${planStyles.row}">${details.map(item => `<span style="${planStyles.chip}">${escapeHTML(item)}</span>`).join("")}</div>` : ""}
        ${requiresApproval ? `<div style="${planStyles.warning}">Approval is required before this internal action can execute.</div>` : ""}
        ${missing.length ? `<div style="${planStyles.warning}">Missing: ${missing.map(escapeHTML).join(", ")}</div>` : ""}
    `;

    return card;
}

function attachPendingPlan() {
    if (!pendingActionPlan) return;

    const messages = document.querySelectorAll(".assistant-message-wrapper");
    const latest = messages[messages.length - 1];
    if (!latest || latest.nextElementSibling?.classList.contains("kia-action-plan")) return;

    const card = describePlan(pendingActionPlan.action_plan);
    pendingActionPlan = null;
    if (!card) return;

    latest.insertAdjacentElement("afterend", card);
    const chatArea = document.querySelector(".chat-area");
    if (chatArea) chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: "smooth" });
}

window.addEventListener("kia-action-plan", event => {
    const decision = event.detail;
    const plan = decision?.action_plan;
    if (!plan?.planned) return;

    pendingActionPlan = {
        decisionId: decision.id,
        action_plan: {
            ...plan,
            decision_id: plan.decision_id || decision.id,
            requires_approval: decision.requires_approval ?? plan.requires_approval,
            approval_status: decision.approval_status
        }
    };

    attachPendingPlan();
});

const observer = new MutationObserver(() => attachPendingPlan());
observer.observe(document.body, { childList: true, subtree: true });
