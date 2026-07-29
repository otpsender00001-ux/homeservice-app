// =========================
// REGISTER PAGE
// =========================

document.addEventListener("DOMContentLoaded", () => {

    const form = document.querySelector("form");

    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");

    const togglePassword = document.getElementById("togglePassword");
    const toggleConfirmPassword = document.getElementById("toggleConfirmPassword");

    const loadingOverlay = document.getElementById("loadingOverlay");

    // =========================
    // PASSWORD TOGGLE
    // =========================

    if (togglePassword && password) {

        const icon = togglePassword.querySelector("i");

        togglePassword.addEventListener("click", () => {

            if (password.type === "password") {

                password.type = "text";
                icon.classList.replace("fa-eye", "fa-eye-slash");

            } else {

                password.type = "password";
                icon.classList.replace("fa-eye-slash", "fa-eye");

            }

        });

    }

    // =========================
    // CONFIRM PASSWORD TOGGLE
    // =========================

    if (toggleConfirmPassword && confirmPassword) {

        const icon = toggleConfirmPassword.querySelector("i");

        toggleConfirmPassword.addEventListener("click", () => {

            if (confirmPassword.type === "password") {

                confirmPassword.type = "text";
                icon.classList.replace("fa-eye", "fa-eye-slash");

            } else {

                confirmPassword.type = "password";
                icon.classList.replace("fa-eye-slash", "fa-eye");

            }

        });

    }

    // =========================
    // FORM VALIDATION
    // =========================

    if (form) {

        form.addEventListener("submit", (e) => {

            let valid = true;


            const inputs = form.querySelectorAll("input");

            inputs.forEach(input => {
                input.classList.remove("input-error");
            });

            // Empty fields

            inputs.forEach(input => {

                if (input.value.trim() === "") {

                    valid = false;
                    input.classList.add("input-error");

                }

            });

            // Password match

            if (password && confirmPassword) {

                if (password.value !== confirmPassword.value) {

                    valid = false;

                    password.classList.add("input-error");
confirmPassword.classList.add("input-error");

// Clear both password fields
password.value = "";
confirmPassword.value = "";

// Put the cursor back in the Password field
password.focus();

// Show toast notification
showToast("❌ Passwords do not match. Please try again.", "error");

                }

            }

            if (!valid) {

                e.preventDefault();
                return;

            }

            // Show loading overlay if available

            if (loadingOverlay) {

                loadingOverlay.style.display = "flex";

            }

        });

    }

});

// =========================
// SHOW ERROR
// =========================

function showToast(message, type) {

    const toast = document.getElementById("toast");

    if (!toast) return;

    toast.textContent = message;

    toast.className = "";

    toast.classList.add(type);

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 3500);

}