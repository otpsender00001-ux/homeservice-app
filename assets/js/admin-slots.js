document.addEventListener('DOMContentLoaded', function() {
    loadSlots();

    document.getElementById('slotForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData();
        formData.append('time_start', document.getElementById('startTime').value);
        formData.append('time_end', document.getElementById('endTime').value);
        formData.append('max_capacity', document.getElementById('maxCapacity').value);

        fetch('../backend/admin/save_slot.php', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success') {
                alert('Slot added!');
                loadSlots();
            } else {
                alert(data.message);
            }
        });
    });
});

function loadSlots() {
    fetch('../backend/admin/manage_slots_logic.php?action=fetch')
    .then(res => res.json())
    .then(data => {
        let rows = '';
        data.forEach(slot => {
            rows += `
                <tr>
                    <td>${slot.time_start} - ${slot.time_end}</td>
                    <td>${slot.max_capacity} Users</td>
                    <td>
                        <button onclick="deleteSlot(${slot.id})" class="btn btn-danger btn-sm">Delete</button>
                    </td>
                </tr>
            `;
        });
        document.getElementById('slotTableBody').innerHTML = rows;
    });
}

function deleteSlot(id) {
    if(confirm('Are you sure?')) {
        fetch(`../backend/admin/manage_slots_logic.php?action=delete&id=${id}`)
        .then(() => loadSlots());
    }
}