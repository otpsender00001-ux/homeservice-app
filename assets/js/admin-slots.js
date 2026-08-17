document.addEventListener('DOMContentLoaded', function() {
    loadSlots();

    // =========================
    // ADD TIME SLOT
    // =========================

    const startTimeInput = document.getElementById('start-time');
    const endTimeInput = document.getElementById('end-time');
    const capacityInput = document.getElementById('slot-capacity');

    // =========================
    // EXISTING ADD SLOT FUNCTION
    // =========================

    window.addSlot = function() {

        const startTime = startTimeInput ? startTimeInput.value : '';
        const endTime = endTimeInput ? endTimeInput.value : '';
        const maxCapacity = capacityInput ? capacityInput.value : '';

        // Check required fields
        if (!startTime || !endTime || !maxCapacity) {
            alert('Please complete all required fields.');
            return;
        }

        // Check capacity
        if (parseInt(maxCapacity) < 1) {
            alert('Maximum customers must be at least 1.');
            return;
        }

        // Check time
        if (startTime >= endTime) {
            alert('End time must be later than start time.');
            return;
        }

        const formData = new FormData();

        formData.append('time_start', startTime);
        formData.append('time_end', endTime);
        formData.append('max_capacity', maxCapacity);

        fetch('../backend/admin/save_slot.php', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {

            if (data.status === 'success') {

                alert('Slot added!');

                // Clear inputs
                if (startTimeInput) {
                    startTimeInput.value = '';
                }

                if (endTimeInput) {
                    endTimeInput.value = '';
                }

                if (capacityInput) {
                    capacityInput.value = '5';
                }

                // Refresh existing slots
                loadSlots();

            } else {

                alert(
                    data.message ||
                    'Failed to add time slot.'
                );

            }

        })
        .catch(error => {

            console.error('Add Slot Error:', error);

            alert(
                'Something went wrong while adding the time slot.'
            );

        });
    };
});


// =========================
// LOAD EXISTING SLOTS
// =========================

function loadSlots() {

    fetch('../backend/admin/manage_slots_logic.php?action=fetch')

        .then(res => res.json())

        .then(data => {

            const tableBody =
                document.getElementById('slot-table-body');

            if (!tableBody) return;

            let rows = '';

            if (!Array.isArray(data) || data.length === 0) {

                tableBody.innerHTML = `
                    <tr>
                        <td
                            colspan="3"
                            style="text-align:center;">
                            No time slots found.
                        </td>
                    </tr>
                `;

                return;
            }

            data.forEach(slot => {

                rows += `
                    <tr>

                        <td>
                            <strong>
                                ${formatSlotTime(slot.time_start)}
                                -
                                ${formatSlotTime(slot.time_end)}
                            </strong>
                        </td>

                        <td>
                            ${slot.max_capacity} Users
                        </td>

                        <td>
                            <button
                                onclick="deleteSlot(${slot.id})"
                                class="btn btn-danger btn-sm">
                                Remove
                            </button>
                        </td>

                    </tr>
                `;

            });

            tableBody.innerHTML = rows;

        })

        .catch(error => {

            console.error(
                'Load Slots Error:',
                error
            );

        });
}


// =========================
// DELETE SLOT
// =========================

function deleteSlot(id) {

    if (!confirm('Are you sure you want to remove this time slot?')) {
        return;
    }

    fetch(
        `../backend/admin/manage_slots_logic.php?action=delete&id=${id}`
    )

    .then(res => res.json())

    .then(data => {

        if (
            data.status === 'deleted' ||
            data.success === true
        ) {

            loadSlots();

        } else {

            alert(
                data.message ||
                'Failed to remove time slot.'
            );

        }

    })

    .catch(error => {

        console.error(
            'Delete Slot Error:',
            error
        );

        alert(
            'Something went wrong while removing the time slot.'
        );

    });
}


// =========================
// FORMAT TIME
// =========================

function formatSlotTime(timeStr) {

    if (!timeStr) {
        return 'N/A';
    }

    const parts = timeStr.split(':');

    const hours = parseInt(parts[0]);
    const minutes = parts[1];

    const ampm = hours >= 12 ? 'PM' : 'AM';

    const formattedHours =
        hours % 12 || 12;

    return `${formattedHours}:${minutes} ${ampm}`;
}