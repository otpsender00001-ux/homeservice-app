document.addEventListener('DOMContentLoaded', () => {
    loadProfileData();

    document.getElementById('techProfileForm').onsubmit = async function(e) {
        e.preventDefault();
        
        const saveBtn = document.getElementById('saveBtn');
        saveBtn.innerText = "Saving...";
        saveBtn.disabled = true;

        const formData = new FormData(this);

        try {
            const response = await fetch('../backend/technician/update_profile.php', {
                method: 'POST',
                body: formData,
                credentials: 'same-origin'
            });
            const data = await response.json();

            if(data.status === 'success') {
                // Update the preview card on the left
                document.getElementById('display-name').innerText = document.getElementById('tech_name').value;
                document.getElementById('display-specialization').innerText = document.getElementById('tech_specialization').value;
                document.getElementById('display-phone').innerText = document.getElementById('tech_phone').value;
                
                alert("Profile and Personal Information updated successfully!");
                
                // I-reload ang data para sure na updated ang display
                loadProfileData();
            } else {
                alert("Error: " + data.message);
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Something went wrong.");
        } finally {
            saveBtn.innerText = "Save All Changes";
            saveBtn.disabled = false;
        }
    };
});

// Function para kunin ang info sa database at ilagay sa textboxes
async function loadProfileData() {
    try {
        const response = await fetch('../backend/technician/get_profile.php', {
            credentials: 'same-origin'
        });
        const res = await response.json();

        if (res.status === 'success') {
            const data = res.data;
            
            // Ilagay sa Input Forms
            document.getElementById('tech_name').value = data.full_name || '';
            document.getElementById('tech_phone').value = data.phone || '';
            document.getElementById('tech_address').value = data.address || '';
            document.getElementById('tech_specialization').value = data.specialization || '';
            
            // ✅ IDINAGDAG: Ilagay ang Bday, Gender, at Bio pabalik sa form fields para hindi mabura
            document.getElementById('tech_bday').value = data.bday || '';
            document.getElementById('tech_gender').value = data.gender || 'Male';
            document.getElementById('tech_bio').value = data.bio || '';

            // Update ng Preview Card sa Kaliwa
            document.getElementById('display-name').innerText = data.full_name || 'Your Name';
            document.getElementById('display-specialization').innerText = data.specialization || 'No Specialization';
            document.getElementById('display-phone').innerText = data.phone || 'No Phone';
            document.getElementById('display-email').innerText = data.email || 'No Email';

            // Update ng REAL RATINGS
            const ratingDisplay = document.getElementById('display-rating');
            if(ratingDisplay) {
                const stars = parseFloat(data.avg_rating) > 0 ? data.avg_rating : '0.0';
                ratingDisplay.innerText = `⭐ ${stars} (${data.review_count} reviews)`;
            }

            // Kung may profile picture
            if(data.profile_image) {
                document.getElementById('avatar-preview-img').src = '../uploads/profiles/' + data.profile_image;
            }
        }
    } catch (error) {
        console.error("Error fetching profile data:", error);
    }
}

function previewImage(event) {
    const reader = new FileReader();
    reader.onload = function() {
        document.getElementById('avatar-preview-img').src = reader.result;
    };
    if(event.target.files[0]){
        reader.readAsDataURL(event.target.files[0]);
    }
}