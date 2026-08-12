document.addEventListener("DOMContentLoaded", () => {

    loadProfileData();

    document.getElementById("profileForm").onsubmit = saveProfile;

    // Initialize Address API
    initAddressAPI();

    setupProfileValidation();

});


/* =====================================================
   PROFILE
===================================================== */
function setupProfileValidation() {

    const nameInput = document.getElementById("full_name");
    const phoneInput = document.getElementById("phone");


    // FULL NAME
    if (nameInput) {

        nameInput.addEventListener("input", function () {

            this.value = this.value.replace(
                /[^a-zA-Z\s]/g,
                ""
            );

        });

    }


    // PHONE
    if (phoneInput) {

        phoneInput.addEventListener("input", function () {

            // Numbers only
            this.value = this.value.replace(
                /[^0-9]/g,
                ""
            );


            // Maximum 11 digits
            if (this.value.length > 11) {

                this.value =
                    this.value.substring(0, 11);

            }

        });

    }

}

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
            document.getElementById("gender").value = data.gender || "Male";
            document.getElementById("birthday").value = data.bday || "";

            document.getElementById("display-name").innerText =
                data.full_name || "Your Name";

            document.getElementById("display-email").innerText =
                data.email || "No Email";

            document.getElementById("display-email2").innerText =
                data.email || "No Email";

            document.getElementById("display-phone").innerText =
                data.phone || "No Phone";

            if(data.profile_image){

                document.getElementById("avatar-preview-img").src =
                    "../uploads/profiles/" + data.profile_image;

            }

        }

    }catch(error){

        console.error(error);

    }

}


async function saveProfile(e){

    e.preventDefault();

    const saveBtn = document.getElementById("saveBtn");

    saveBtn.disabled = true;
    saveBtn.innerText = "Saving...";

    const fullName =
    document.getElementById("full_name").value.trim();

const phone =
    document.getElementById("phone").value.trim();


if (!/^[a-zA-Z\s]+$/.test(fullName)) {

    alert(
        "Full name must contain letters and spaces only."
    );

    saveBtn.disabled = false;
    saveBtn.innerText = "Save All Changes";

    return;
}


if (!/^09[0-9]{9}$/.test(phone)) {

    alert(
        "Phone number must start with 09 and contain exactly 11 digits."
    );

    saveBtn.disabled = false;
    saveBtn.innerText = "Save All Changes";

    return;
}

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

    }catch(error){

        console.error(error);

        alert("Something went wrong.");

    }finally{

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



/* =====================================================
   ADDRESS MODAL
===================================================== */

function openAddressModal(){

    document.getElementById("addressModal").style.display = "flex";

}

function closeAddressModal(){

    document.getElementById("addressModal").style.display = "none";

}

window.onclick = function(e){

    const modal = document.getElementById("addressModal");

    if(e.target === modal){

        closeAddressModal();

    }

};



/* =====================================================
   ADDRESS API
===================================================== */

const BASE_URL = "https://psgc.gitlab.io/api";

let regions = [];
let provinces = [];
let editingAddressId = null;

async function loadRegions(){

    try{

        const response = await fetch(BASE_URL + "/regions/");

        regions = await response.json();

    }catch(error){

        console.error(error);

    }

}

async function initAddressAPI(){

    await loadRegions();

    await loadProvinces();

    setupValidationAndRestrictions();

}


async function loadProvinces(){

    const province = document.getElementById("addr_province");

    province.innerHTML =
        '<option value="">Select Province</option>';

    try{

        const response = await fetch(BASE_URL + "/provinces/");

        provinces = await response.json();

        provinces.sort((a,b)=>a.name.localeCompare(b.name));

        provinces.forEach(p=>{

            province.innerHTML += `
                <option
                    value="${p.code}"
                    data-region="${p.regionCode}">
                    ${p.name}
                </option>
            `;

        });

    }catch(error){

        console.error(error);

    }

}

document.getElementById("addr_province").addEventListener("change", async function(){

    const provinceCode = this.value;

    const city = document.getElementById("addr_city");
    const brgy = document.getElementById("addr_brgy");

    city.disabled = true;
    brgy.disabled = true;

    city.innerHTML =
        '<option value="">Select Municipality</option>';

    brgy.innerHTML =
        '<option value="">Select Barangay</option>';

    document.getElementById("addr_region").value = "";

    if(!provinceCode) return;

    const province =
        provinces.find(p=>p.code===provinceCode);

    if(province){

        const region =
            regions.find(r=>r.code===province.regionCode);

        if(region){

            document.getElementById("addr_region").value =
                region.name;

        }

    }

    await loadCities(provinceCode);

});


async function loadCities(provinceCode){

    const city =
        document.getElementById("addr_city");

    city.disabled = false;
    document.getElementById("addr_brgy").disabled = true;

    city.innerHTML =
        '<option>Loading...</option>';

    try{

        const response = await fetch(

            BASE_URL +
            "/provinces/" +
            provinceCode +
            "/cities-municipalities/"

        );

        const cities = await response.json();

        city.innerHTML =
            '<option value="">Select Municipality</option>';

        cities.sort((a,b)=>a.name.localeCompare(b.name));

        cities.forEach(c=>{

            city.innerHTML += `
                <option value="${c.code}">
                    ${c.name}
                </option>
            `;

        });

    }catch(error){

        console.error(error);

    }

}

document.getElementById("addr_city").addEventListener("change", async function(){

    await loadBarangays(this.value);

});

async function loadBarangays(cityCode){

    const brgy =
        document.getElementById("addr_brgy");

    brgy.disabled = false;
    brgy.innerHTML =
    '<option value="">Select Barangay</option>';

    brgy.innerHTML =
        '<option>Loading...</option>';

    try{

        const response = await fetch(

            BASE_URL +
            "/cities-municipalities/" +
            cityCode +
            "/barangays/"

        );

        const barangays =
            await response.json();

        brgy.innerHTML =
            '<option value="">Select Barangay</option>';

        barangays.sort((a,b)=>a.name.localeCompare(b.name));

        barangays.forEach(b=>{

            brgy.innerHTML += `
                <option value="${b.name}">
                    ${b.name}
                </option>
            `;

        });

    }catch(error){

        console.error(error);

    }

}

function setupValidationAndRestrictions(){

    const ids=[

        "addr_name",
        "addr_phone",
        "addr_postal",
        "addr_province",
        "addr_city",
        "addr_brgy",
        "addr_street"

    ];

    ids.forEach(id=>{

        const el=document.getElementById(id);

        if(!el) return;

        el.addEventListener("input",validateAddressForm);

        el.addEventListener("change",validateAddressForm);

    });

}


function validateAddressForm(){

    
    const btn=document.getElementById("addr_submit_btn");

    const ok=

        document.getElementById("addr_name").value.trim() &&
        document.getElementById("addr_phone").value.trim() &&
        document.getElementById("addr_postal").value.trim() &&
        document.getElementById("addr_province").value &&
        document.getElementById("addr_city").value &&
        document.getElementById("addr_brgy").value &&
        document.getElementById("addr_street").value.trim();

    btn.disabled=!ok;

    if(ok){

        btn.classList.add("enabled");

    }else{

        btn.classList.remove("enabled");

    }

}



/* =====================================================
   ADDRESS MANAGER
===================================================== */

function openAddressManager(){

    document.getElementById("addressManagerModal").style.display = "flex";

    loadAddresses();

}

function closeAddressManager(){

    document.getElementById("addressManagerModal").style.display = "none";

}

function openAddAddressForm(){

    editingAddressId = null;

    document.getElementById("addr_submit_btn").innerText =
        "Save Address";

    document.getElementById("addr_label").value = "";
    document.getElementById("addr_name").value = "";
    document.getElementById("addr_phone").value = "";
    document.getElementById("addr_postal").value = "";
    document.getElementById("addr_region").value = "";
    document.getElementById("addr_street").value = "";

    document.getElementById("addr_province").selectedIndex = 0;
    document.getElementById("addr_city").innerHTML =
        '<option value="">Select Municipality</option>';
    document.getElementById("addr_brgy").innerHTML =
        '<option value="">Select Barangay</option>';

    document.getElementById("addr_city").disabled = true;
    document.getElementById("addr_brgy").disabled = true;

    closeAddressManager();

    openAddressModal();

}



/* =====================================================
   SAVE ADDRESS
===================================================== */

async function saveAddress(){

    const formData = new FormData();

    formData.append(
        "recipient_name",
        document.getElementById("addr_name").value
    );

    formData.append(
        "phone",
        document.getElementById("addr_phone").value
    );

    formData.append(
        "address",
        document.getElementById("addr_street").value
    );

    formData.append(
        "barangay",
        document.getElementById("addr_brgy").selectedOptions[0].text
    );

    formData.append(
        "city",
        document.getElementById("addr_city").selectedOptions[0].text
    );

    formData.append(
        "province",
        document.getElementById("addr_province").selectedOptions[0].text
    );

    formData.append(
        "region",
        document.getElementById("addr_region").value
    );

    formData.append(
        "postal_code",
        document.getElementById("addr_postal").value
    );

    try{

        let response;

if(editingAddressId){

    formData.append("id", editingAddressId);

    response = await fetch(
        "../backend/users/update_address.php",
        {
            method:"POST",
            body:formData
        }
    );

}else{

    response = await fetch(
        "../backend/users/add_address.php",
        {
            method:"POST",
            body:formData
        }
    );

}

        const result = await response.json();

        if(result.success){

    alert(result.message);

    editingAddressId = null;

    document.getElementById("addr_submit_btn").innerText =
        "Save Address";

    closeAddressModal();

    openAddressManager();

    loadAddresses();

}else{

            alert(result.message);

        }

    }catch(error){

        console.error(error);

        alert("Unable to save address.");

    }

}


async function loadAddresses(){

    const container = document.getElementById("addressList");

    container.innerHTML = `
        <div class="empty-address">
            Loading addresses...
        </div>
    `;

    try{

        const response = await fetch(
            "../backend/users/get_address.php",
            {
                credentials:"same-origin"
            }
        );

        const result = await response.json();

        console.log(result);
console.log(result.addresses);

        if(!result.success){

    container.innerHTML = `
        <div class="empty-address">
            Failed to load addresses.
        </div>
    `;

    return;

}

        if(result.addresses.length===0){

            container.innerHTML=`
                <div class="empty-address">
                    No saved addresses yet.
                </div>
            `;

            return;

        }

        container.innerHTML="";

        result.addresses.forEach(address=>{

            container.innerHTML += `

            <div class="address-card">

    <div class="address-top">

        <div>

            <h3>${address.recipient_name}</h3>

            <span>${address.phone}</span>

        </div>

        ${
            address.is_default == 1
            ? `<span class="default-badge">Default</span>`
            : ``
        }

    </div>

    <div class="address-body">

        <p>${address.street}</p>

        <p>
            Brgy. ${address.barangay},
            ${address.city},
            ${address.province}
        </p>

        <p>${address.region}</p>

        <p>${address.postal_code}</p>

    </div>

    <div class="address-footer">

        <button
            class="edit-btn"
            onclick="editAddress(${address.id})">

            Edit

        </button>

        <button
            class="delete-btn"
            onclick="deleteAddress(${address.id})">

            Delete

        </button>

    </div>

</div>

            `;

        });

    }catch(error){

        console.error(error);

        container.innerHTML=`
            <div class="empty-address">
                Unable to load addresses.
            </div>
        `;

    }

}

async function editAddress(id){

    editingAddressId = id;

    const response = await fetch(
        "../backend/users/get_address.php",
        {
            credentials:"same-origin"
        }
    );

    const result = await response.json();

    if(!result.success){

        alert("Unable to load address.");
        return;

    }

    const address = result.addresses.find(a => a.id == id);

    if(!address){

        alert("Address not found.");
        return;

    }

    // Basic Information
    document.getElementById("addr_name").value = address.recipient_name;
    document.getElementById("addr_phone").value = address.phone;
    document.getElementById("addr_postal").value = address.postal_code;
    document.getElementById("addr_region").value = address.region;
    document.getElementById("addr_street").value = address.street;

    // -------------------------------
    // Province
    // -------------------------------

    const province = provinces.find(
        p => p.name.toLowerCase() === address.province.toLowerCase()
    );

    if(province){

        document.getElementById("addr_province").value = province.code;

        await loadCities(province.code);

        const citySelect = document.getElementById("addr_city");

        const cityOption = [...citySelect.options].find(
            o => o.text.trim().toLowerCase() ===
                 address.city.trim().toLowerCase()
        );

        if(cityOption){

            citySelect.value = cityOption.value;

            await loadBarangays(cityOption.value);

            const brgySelect =
                document.getElementById("addr_brgy");

            const brgyOption = [...brgySelect.options].find(
                o => o.text.trim().toLowerCase() ===
                     address.barangay.trim().toLowerCase()
            );

            if(brgyOption){

                brgySelect.value = brgyOption.value;

            }

        }

    }

    validateAddressForm();

    document.getElementById("addr_submit_btn").innerText =
        "Update Address";

    closeAddressManager();

    openAddressModal();

}

async function deleteAddress(id){

    const confirmDelete = confirm(
        "Are you sure you want to delete this address?"
    );

    if(!confirmDelete){

        return;

    }

    const formData = new FormData();

    formData.append("id", id);

    try{

        const response = await fetch(

            "../backend/users/delete_address.php",

            {

                method:"POST",

                body:formData

            }

        );

        const result = await response.json();

        if(result.success){

            alert(result.message);

            loadAddresses();

        }else{

            alert(result.message);

        }

    }catch(error){

        console.error(error);

        alert("Unable to delete address.");

    }

}
/* =====================================================
   CLOSE MODALS WHEN CLICKING OUTSIDE
===================================================== */

window.addEventListener("click",function(e){

    const addressModal=document.getElementById("addressModal");

    const managerModal=document.getElementById("addressManagerModal");

    if(e.target===addressModal){

        closeAddressModal();

    }

    if(e.target===managerModal){

        closeAddressManager();

    }

});