// SHOW / HIDE PASSWORD
document.querySelectorAll(".password-toggle").forEach(toggle => {
toggle.addEventListener("click", () => {
const input = toggle.previousElementSibling;

if(input.type === "password"){
input.type = "text";
toggle.textContent = "🙈";
}else{
input.type = "password";
toggle.textContent = "👁";
}
});
});

// FORM VALIDATION
const forms = document.querySelectorAll("form");

forms.forEach(form => {
form.addEventListener("submit", (e) => {

let valid = true;

// REMOVE OLD ALERT
const oldAlert = form.querySelector(".alert");
if(oldAlert) oldAlert.remove();

const inputs = form.querySelectorAll("input");

// reset
inputs.forEach(input => input.classList.remove("input-error"));

// PASSWORD MATCH (REGISTER)
const password = form.querySelector("input[name='password']");
const confirm = form.querySelector("input[name='confirm_password']");

if(password && confirm){
if(password.value !== confirm.value){
valid = false;
password.classList.add("input-error");
confirm.classList.add("input-error");

showError(form, "Passwords do not match.");
}
}

// EMPTY CHECK
inputs.forEach(input => {
if(input.value.trim() === ""){
valid = false;
input.classList.add("input-error");
}
});

if(!valid){
e.preventDefault();
}

});
});

// SHOW ERROR FUNCTION
function showError(form, message){
const div = document.createElement("div");
div.className = "alert alert-error";
div.textContent = message;

form.prepend(div);
}