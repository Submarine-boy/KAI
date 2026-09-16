import { supabase } from "./supabase.js";

const {
    data: { session },
    error: sessionError
} = await supabase.auth.getSession();

if (sessionError || !session) {
    window.location.replace("login.html");
} else {
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("status")
        .eq("user_id", session.user.id)
        .maybeSingle();

    if (profileError) {
        console.error("KIA profile check failed:", profileError);
        await supabase.auth.signOut();
        window.location.replace("login.html");
    } else if (!profile) {
        console.error("KIA profile not found.");
        await supabase.auth.signOut();
        window.location.replace("login.html");
    } else if (profile.status !== "active") {
        window.location.replace("pending.html");
    }
}
