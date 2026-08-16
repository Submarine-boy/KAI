import { supabase } from "./supabase.js";

const loginForm = document.querySelector(".auth-form");

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value;

    const submitButton = document.querySelector(".submit-btn");

    submitButton.disabled = true;
    submitButton.textContent = "Logging in...";

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            throw error;
        }

        if (data.session) {
            window.location.href = "nova.html";
        }

    } catch (error) {

        console.error("Login error:", error);

        alert(error.message);

        submitButton.disabled = false;
        submitButton.innerHTML = "Log in <span>→</span>";
    }
});

const googleButton = document.querySelector("#google-login");

googleButton?.addEventListener("click", async () => {

    const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: `${window.location.origin}/nova.html`
        }
    });

    if (error) {
        console.error("Google login error:", error);
        alert(error.message);
    }
});
