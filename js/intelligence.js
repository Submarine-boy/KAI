import { supabase } from "./supabase.js";

/*
 * Intelligence Router bridge.
 *
 * The existing chat UI still calls `swift-task`. We intentionally keep
 * that interface stable and route the request through the new
 * `kia-intelligence` orchestration layer instead of rewriting the working
 * chat workflow.
 */
const originalInvoke = supabase.functions.invoke.bind(supabase.functions);

supabase.functions.invoke = async (functionName, options = {}) => {
    if (functionName !== "swift-task") {
        return originalInvoke(functionName, options);
    }

    const body = {
        ...(options.body || {})
    };

    const activeChat = document.querySelector(".history-item.active");
    if (activeChat?.dataset?.chatId) {
        body.chat_id = activeChat.dataset.chatId;
    }

    const result = await originalInvoke("kia-intelligence", {
        ...options,
        body
    });

    /*
     * `kia-intelligence` records decisions server-side. The decision trigger
     * may then attach a verified action plan. Fetch that plan after the
     * function returns so the existing chat response can expose the plan
     * without changing the stable Edge Function response contract.
     */
    if (!result.error && result.data?.intelligence?.decision?.id) {
        const decisionId = result.data.intelligence.decision.id;

        const { data: actionPlan, error: actionPlanError } = await supabase
            .from("intelligence_decisions")
            .select("id, decision_type, requires_approval, approval_status, status, action_plan")
            .eq("id", decisionId)
            .maybeSingle();

        if (!actionPlanError && actionPlan) {
            result.data.intelligence.decision = {
                ...result.data.intelligence.decision,
                ...actionPlan
            };

            window.dispatchEvent(new CustomEvent("kia-action-plan", {
                detail: actionPlan
            }));
        } else if (actionPlanError) {
            console.warn("KIA action plan could not be loaded:", actionPlanError);
        }
    }

    return result;
};
