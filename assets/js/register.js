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

            // Remove previous error styles
            inputs.forEach(input => {
                input.classList.remove("input-error");
            });

            // =========================
            // EMPTY FIELD VALIDATION
            // =========================

            inputs.forEach(input => {

                if (input.value.trim() === "") {

                    valid = false;
                    input.classList.add("input-error");

                }

            });

            // Stop immediately if fields are empty
            if (!valid) {

                e.preventDefault();

                showToast("❌ Please fill in all required fields.", "error");

                return;

            }

            // =========================
            // PASSWORD STRENGTH
            // =========================

            const passwordRegex =
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#!^()_\-+=])[A-Za-z\d@$!%*?&#!^()_\-+=]{6,}$/;

            if (!passwordRegex.test(password.value)) {

                e.preventDefault();

                password.classList.add("input-error");
                confirmPassword.classList.add("input-error");

                password.value = "";
                confirmPassword.value = "";

                password.focus();

                showToast(
                    "❌ Password must be at least 6 characters and include uppercase, lowercase, a number, and a special character.",
                    "error"
                );

                return;

            }

            // =========================
            // PASSWORD MATCH
            // =========================

            if (password.value !== confirmPassword.value) {

                e.preventDefault();

                password.classList.add("input-error");
                confirmPassword.classList.add("input-error");

                password.value = "";
                confirmPassword.value = "";

                password.focus();

                showToast(
                    "❌ Passwords do not match. Please try again.",
                    "error"
                );

                return;

            }

            // =========================
            // SHOW LOADING
            // =========================

            if (loadingOverlay) {

                loadingOverlay.style.display = "flex";

            }

        });

    }

});

// =========================
// TOAST NOTIFICATION
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