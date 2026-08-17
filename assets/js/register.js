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
    // CONFIRM PASSWORD INPUT LISTENER (Dito idinagdag)
    // =========================

    if (confirmPassword) {
        confirmPassword.addEventListener("input", () => {
            hidePasswordError();
        });
    }

    // =========================
    // PASSWORD STRENGTH INDICATOR
    // =========================

    const passwordStrengthText = document.getElementById("passwordStrengthText");
    const strengthDots = document.querySelectorAll(".strength-dot");
    const strengthSegments = document.querySelectorAll(".strength-segment");

    const reqLength = document.getElementById("reqLength");
    const reqUppercase = document.getElementById("reqUppercase");
    const reqLowercase = document.getElementById("reqLowercase");
    const reqNumber = document.getElementById("reqNumber");
    const reqSpecial = document.getElementById("reqSpecial");

    function updateRequirement(element, passed) {

        if (!element) return;

        const icon = element.querySelector("i");

        if (passed) {

            element.classList.add("met");

            if (icon) {
                icon.classList.remove("fa-circle");
                icon.classList.add("fa-circle-check");
            }

        } else {

            element.classList.remove("met");

            if (icon) {
                icon.classList.remove("fa-circle-check");
                icon.classList.add("fa-circle");
            }

        }

    }

    function updatePasswordStrength() {

        if (!password) return;

        const value = password.value;

        const hasLength = value.length >= 6;
        const hasUppercase = /[A-Z]/.test(value);
        const hasLowercase = /[a-z]/.test(value);
        const hasNumber = /\d/.test(value);
        const hasSpecial = /[@$!%*?&#!^()_\-+=]/.test(value);

        const requirements = [
            hasLength,
            hasUppercase,
            hasLowercase,
            hasNumber,
            hasSpecial
        ];

        const passedCount = requirements.filter(Boolean).length;

        // Update individual requirements
        updateRequirement(reqLength, hasLength);
        updateRequirement(reqUppercase, hasUppercase);
        updateRequirement(reqLowercase, hasLowercase);
        updateRequirement(reqNumber, hasNumber);
        updateRequirement(reqSpecial, hasSpecial);

        // Reset strength states
        strengthDots.forEach(dot => {
            dot.classList.remove(
                "active",
                "weak",
                "medium",
                "strong"
            );
        });

        strengthSegments.forEach(segment => {
            segment.classList.remove(
                "active",
                "weak",
                "medium",
                "strong"
            );
        });

        if (passwordStrengthText) {
            passwordStrengthText.className = "";
        }

        // Empty password
        if (value.length === 0) {

            if (passwordStrengthText) {
                passwordStrengthText.textContent = "Weak";
            }

            return;
        }

        // Determine strength
        let strengthClass = "weak";
        let strengthLabel = "Weak";

        if (passedCount >= 4) {
            strengthClass = "strong";
            strengthLabel = passedCount === 5
                ? "Strong"
                : "Almost Strong";
        } else if (passedCount >= 2) {
            strengthClass = "medium";
            strengthLabel = "Medium";
        }

        // Update strength label
        if (passwordStrengthText) {

            passwordStrengthText.textContent = strengthLabel;

            passwordStrengthText.classList.add(strengthClass);

        }

        // Update progress dots
        strengthDots.forEach((dot, index) => {

            if (index < passedCount) {

                dot.classList.add(
                    "active",
                    strengthClass
                );

            }

        });

        // Update progress lines
        strengthSegments.forEach((segment, index) => {

            if (index < passedCount - 1) {

                segment.classList.add(
                    "active",
                    strengthClass
                );

            }

        });

    }

    if (password) {

        password.addEventListener(
            "input",
            updatePasswordStrength
        );

        password.addEventListener("input", () => {
            hidePasswordError();
        });

        updatePasswordStrength();

    }

    // =========================
    // PASSWORD ERROR MESSAGE
    // =========================

    const passwordErrorMessage =
        document.getElementById("passwordErrorMessage");

    function showPasswordError(message) {

        if (!passwordErrorMessage) return;

        passwordErrorMessage.textContent = "❌ " + message;
        passwordErrorMessage.classList.add("show");

    }

    function hidePasswordError() {

        if (!passwordErrorMessage) return;

        passwordErrorMessage.textContent = "";
        passwordErrorMessage.classList.remove("show");

    }

  // =========================
// REGISTER BUTTON STATE
// =========================

const registerButton = form
    ? form.querySelector('button[type="submit"]')
    : null;

function updateRegisterButton() {

    if (!registerButton || !password) return;

    const value = password.value;

    const hasLength = value.length >= 6;
    const hasUppercase = /[A-Z]/.test(value);
    const hasLowercase = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSpecial = /[@$!%*?&#!^()_\-+=]/.test(value);

    const isStrong =
        hasLength &&
        hasUppercase &&
        hasLowercase &&
        hasNumber &&
        hasSpecial;

    /*
       IMPORTANT:
       Huwag gagamit ng registerButton.disabled.
       Kailangan clickable pa rin ang button para
       ma-trigger ang existing validation/error message.
    */

    registerButton.classList.toggle(
        "register-disabled",
        !isStrong
    );

    registerButton.setAttribute(
        "aria-disabled",
        isStrong ? "false" : "true"
    );

}

if (password) {

    password.addEventListener(
        "input",
        updateRegisterButton
    );

    updateRegisterButton();

}

if (password) {

    password.addEventListener(
        "input",
        updateRegisterButton
    );

    updateRegisterButton();



    }

    if (password) {

        password.addEventListener(
            "input",
            updateRegisterButton
        );

        updateRegisterButton();

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

                // =========================
                // SPECIFIC PASSWORD ERROR
                // =========================

                if (password.value.length < 6) {

                    showPasswordError(
                        "Password must be at least 6 characters."
                    );

                } else if (!/[A-Z]/.test(password.value)) {

                    showPasswordError(
                        "Password must contain at least one uppercase letter."
                    );

                } else if (!/[a-z]/.test(password.value)) {

                    showPasswordError(
                        "Password must contain at least one lowercase letter."
                    );

                } else if (!/\d/.test(password.value)) {

                    showPasswordError(
                        "Password must contain at least one number."
                    );

                } else if (!/[@$!%*?&#!^()_\-+=]/.test(password.value)) {

                    showPasswordError(
                        "Password must contain at least one special character."
                    );

                } else {

                    showPasswordError(
                        "Please meet all password requirements."
                    );

                }

                password.focus();

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