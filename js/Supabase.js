import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://qljnonlhccxcevrwzykp.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_2Y7h0O3-41EEehAXj6kL5g_yCFPYiYR";

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);