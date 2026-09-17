import { supabase } from "./supabase.js";

/*
 * Intelligence Router bridge.
 *
 * The existing chat UI still calls `swift-task`. We route that request
 * through `kia-intelligence` first, while keeping the proven `swift-task`
 * path as a safe fallback if orchestration is unavailable.
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

    let result;

    try {
        result = await originalInvoke("kia-intelligence", {
            ...options,
            body
        });
    } catch (error) {
        console.warn("KIA orchestration failed; falling back to swift-task:", error);
        return originalInvoke("swift-task", options);
    }

    /*
     * If the orchestration layer returns an HTTP/function error or an empty
     * response, fall back to the existing AI function instead of leaving the
     * composer with no usable reply.
     */
    if (result.error || !result.data?.response) {
        console.warn(
            "KIA orchestration returned no usable response; falling back to swift-task.",
            result.error || result.data
        );
        return originalInvoke("swift-task", options);
    }

    /*
     * `kia-intelligence` records decisions server-side. The decision trigger
     * may then attach a verified action plan. Fetch that plan after the
     * function returns so the existing chat response can expose the plan
     * without changing the stable Edge Function response contract.
     */
    if (result.data?.intelligence?.decision?.id) {
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
