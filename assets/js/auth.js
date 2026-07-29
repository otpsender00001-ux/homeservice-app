const modal = document.getElementById("forgotModal");
const openBtn = document.getElementById("openForgotModal");
const closeBtn = document.getElementById("closeForgotModal");

const togglePassword = document.getElementById("togglePassword");
const password = document.getElementById("password");
const eyeIcon = togglePassword.querySelector("i");
const loadingOverlay = document.getElementById("loadingOverlay");
const toggleConfirmPassword = document.getElementById("toggleConfirmPassword");
const confirmPassword = document.getElementById("confirmPassword");

if(toggleConfirmPassword){

    const icon = toggleConfirmPassword.querySelector("i");

    toggleConfirmPassword.addEventListener("click",()=>{

        if(confirmPassword.type==="password"){

            confirmPassword.type="text";
            icon.classList.replace("fa-eye","fa-eye-slash");

        }else{

            confirmPassword.type="password";
            icon.classList.replace("fa-eye-slash","fa-eye");

        }

    });

}
// =========================
// TOAST NOTIFICATION
// =========================

document.addEventListener("DOMContentLoaded", () => {

    const toast = document.getElementById("toast");

    if (!toast) return;

    const params = new URLSearchParams(window.location.search);

    const error = params.get("error");
    const success = params.get("success");

    const loading = params.get("loading");

if (loading) {

    loadingOverlay.style.display = "flex";

    const loadingText = document.querySelector(".loader-card p");

    const messages = [
        "🔐 Verifying account...",
        "🛡️ Checking permissions...",
        "📦 Preparing dashboard...",
        "✅ Welcome back!"
    ];

    let index = 0;

    loadingText.innerText = messages[0];

    const interval = setInterval(() => {

        index++;

        if (index < messages.length) {
            loadingText.innerText = messages[index];
        }

    }, 500);

    setTimeout(() => {

        clearInterval(interval);

        if (loading === "admin") {
            window.location.href = "admin-dashboard.html";
        }
        else if (loading === "technician") {
            window.location.href = "tech-dashboard.html";
        }
        else {
            window.location.href = "user-dashboard.html";
        }

    }, 2000);

    return;
}
    let message = "";
    let type = "";

    if (error === "user_not_found") {
        message = "❌ Account not found.";
        type = "error";
    }

    if (error === "wrong_password") {
        message = "❌ Incorrect password.";
        type = "error";
    }

    if (success === "registered") {
        message = "✅ Account created successfully!";
        type = "success";
    }

    if (message !== "") {

        toast.textContent = message;

        toast.className = "";

        toast.classList.add(type);
        toast.classList.add("show");

        setTimeout(() => {

            toast.classList.remove("show");

        }, 3500);

    }

});

// =========================
// FORM VALIDATION
// =========================

const forms = document.querySelectorAll("form");

forms.forEach(form => {

    form.addEventListener("submit", (e) => {

        let valid = true;

        const oldAlert = form.querySelector(".alert");

        if (oldAlert) oldAlert.remove();

        const inputs = form.querySelectorAll("input");

        inputs.forEach(input => input.classList.remove("input-error"));

        const password = form.querySelector("input[name='password']");
        const confirm = form.querySelector("input[name='confirm_password']");

        if (password && confirm) {

            if (password.value !== confirm.value) {

                valid = false;

                password.classList.add("input-error");
                confirm.classList.add("input-error");

                showError(form, "Passwords do not match.");

            }

        }

        inputs.forEach(input => {

            if (input.value.trim() === "") {

                valid = false;
                input.classList.add("input-error");

            }

        });

        if(valid){

    loadingOverlay.style.display = "flex";

}

if(!valid){

    e.preventDefault();

}

    });

});

// =========================
// SHOW ERROR
// =========================

function showError(form, message) {

    const div = document.createElement("div");

    div.className = "alert alert-error";

    div.textContent = message;

    form.prepend(div);

}

// =========================
// PASSWORD TOGGLE
// =========================

togglePassword.addEventListener("click", () => {

    if (password.type === "password") {

        password.type = "text";

        eyeIcon.classList.remove("fa-eye");
        eyeIcon.classList.add("fa-eye-slash");

    } else {

        password.type = "password";

        eyeIcon.classList.remove("fa-eye-slash");
        eyeIcon.classList.add("fa-eye");

    }

});

// =========================
// OPEN MODAL
// =========================

openBtn.onclick = function (e) {

    e.preventDefault();

    modal.style.display = "flex";

    document.getElementById("resetMessage").innerText = "";

    document.getElementById("resetEmail").value = "";

};

// =========================
// CLOSE MODAL
// =========================

closeBtn.onclick = function () {

    modal.style.display = "none";

};

window.onclick = function (event) {

    if (event.target == modal) {

        modal.style.display = "none";

    }

};

// =========================
// FORGOT PASSWORD
// =========================

document.getElementById("forgotFormModal").onsubmit = async (e) => {

    e.preventDefault();

    const email = document.getElementById("resetEmail").value;

    const msgDiv = document.getElementById("resetMessage");

    const submitBtn = document.getElementById("resetSubmitBtn");

    submitBtn.innerText = "Sending...";

    submitBtn.disabled = true;

    msgDiv.innerText = "";

    try {

        const res = await fetch("../backend/auth/forgot_password.php", {

            method: "POST",

            headers: {

                "Content-Type": "application/x-www-form-urlencoded"

            },

            body: `email=${encodeURIComponent(email)}`

        });

        const data = await res.json();

        msgDiv.style.color =
            data.status === "success"
                ? "#28a745"
                : "#dc3545";

        msgDiv.innerText = data.message;

    } catch (error) {

        msgDiv.style.color = "#dc3545";

        msgDiv.innerText = "Server connection error. Please try again.";

    } finally {

        submitBtn.innerText = "Send Reset Link";

        submitBtn.disabled = false;

    }

};