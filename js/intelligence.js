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

    return originalInvoke("kia-intelligence", {
        ...options,
        body
    });
};
