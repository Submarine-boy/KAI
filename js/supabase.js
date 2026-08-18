import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://xrxxdwhjcacjfjimvjyc.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_R689TV9oJEeoB2cKzuvEjg_Ok4Wuutw";

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);
