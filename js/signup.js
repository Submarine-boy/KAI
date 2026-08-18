import { supabase } from "./supabase.js";

const signupForm = document.querySelector(".auth-form");

signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.querySelector("#name").value.trim();
    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value;

    const submitButton = document.querySelector(".submit-btn");

    submitButton.disabled = true;
    submitButton.textContent = "Creating account...";

    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,

            options: {
                data: {
                    full_name: name
                }
            }
        });

        if (error) {
            throw error;
        }

        /*
         * If email confirmation is enabled in Supabase,
         * the user needs to confirm their email first.
         */

        if (data.session) {
            window.location.href = "nova.html";
        } else {
            alert(
                "Account created successfully. Please check your email to confirm your account."
            );

            window.location.href = "login.html";
        }

    } catch (error) {

        console.error("Signup error:", error);

        alert(error.message);

        submitButton.disabled = false;
        submitButton.innerHTML = "Create account <span>→</span>";
    }
});

const googleButton = document.querySelector("#google-signup");

googleButton?.addEventListener("click", async () => {

    const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: "https://submarine-boy.github.io/KAI/nova.html"
        }
    });

    if (error) {
        console.error("Google signup error:", error);
        alert(error.message);
    }
});
