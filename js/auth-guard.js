import { supabase } from "./supabase.js";

const {
    data: { session },
    error
} = await supabase.auth.getSession();

if (error || !session) {
    window.location.replace("login.html");
}