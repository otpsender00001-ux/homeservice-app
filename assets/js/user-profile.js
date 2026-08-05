document.addEventListener("DOMContentLoaded", () => {

    loadProfileData();

    document.getElementById("profileForm").onsubmit = saveProfile;

});

async function loadProfileData(){

    try{

        const response = await fetch("../backend/users/get_profile.php",{
            credentials:"same-origin"
        });

        const res = await response.json();

        if(res.status === "success"){

            const data = res.data;

            document.getElementById("full_name").value = data.full_name || "";
            document.getElementById("phone").value = data.phone || "";
            document.getElementById("address").value = data.address || "";
            document.getElementById("gender").value = data.gender || "Male";
            document.getElementById("birthday").value = data.bday || "";
            document.getElementById("bio").value = data.bio || "";

            document.getElementById("display-name").innerText =
                data.full_name || "Your Name";

            document.getElementById("display-email").innerText =
                data.email || "No Email";

            document.getElementById("display-email2").innerText =
                data.email || "No Email";

            document.getElementById("display-phone").innerText =
                data.phone || "No Phone";

            document.getElementById("display-address").innerText =
                data.address || "No Address";

            if(data.profile_image){
                document.getElementById("avatar-preview-img").src =
                    "../uploads/profiles/" + data.profile_image;
            }

        }

    } catch(error){

        console.error("Error loading profile:", error);

    }

}

async function saveProfile(e){

    e.preventDefault();

    const saveBtn = document.getElementById("saveBtn");

    saveBtn.disabled = true;
    saveBtn.innerText = "Saving...";

    const formData = new FormData(document.getElementById("profileForm"));

    try{

        const response = await fetch("../backend/users/update_profile.php",{

            method:"POST",
            body:formData,
            credentials:"same-origin"

        });

        const data = await response.json();

        if(data.success){

            alert("Profile updated successfully!");

            loadProfileData();

        }else{

            alert(data.message);

        }

    }
    catch(error){

        console.error(error);

        alert("Something went wrong.");

    }

    finally{

        saveBtn.disabled = false;
        saveBtn.innerText = "Save All Changes";

    }

}

function previewImage(event){

    const reader = new FileReader();

    reader.onload = function(){

        document.getElementById("avatar-preview-img").src = reader.result;

    };

    if(event.target.files[0]){

        reader.readAsDataURL(event.target.files[0]);

    }

}