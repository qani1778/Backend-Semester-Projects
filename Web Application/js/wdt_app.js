class Dashboard {
    constructor() {
        this.init();
        this.deliveryTimes = []; 
        this.closedAlerts = new Set(); 
        this.alertShown = {}; // Track shown alerts for staff
        this.deliveryAlertShown = {}; // Track shown alerts for deliveries
    }

    init() {
        this.staffUserGet();
        this.setupEventListeners();
        this.digitalClock();
        setInterval(this.digitalClock, 1000);
        setInterval(() => this.staffMemberIsLate(), 1000); 
        setInterval(() => this.deliveryDriverIsLate(), 1000);
    }

    setupEventListeners() {
        $('#tableMain').on('click', 'tbody tr', this.selectRow);
        $('.rightBtn').click(this.staffOut.bind(this));
        $('.leftBtn').click(this.staffIn.bind(this));
        window.onclick = this.closeDropdownOnClickOutside;
        $('.AddrightBtn').click(this.addDelivery.bind(this));
        $('#DeliveryBoardtableMain').on('click', 'tbody tr', this.selectDeliveryRow);
    }

    selectRow() {
        $('#tableMain tbody tr').removeClass('selected-row');
        $(this).addClass('selected-row');
    }

    staffOut() {
        const selectedRow = $('#tableMain tbody tr.selected-row');
        if (selectedRow.length === 0) {
            alert('Please select a staff member first');
            return;
        }

        const minutes = prompt('Please enter the number of minutes the staff member will be out');
        if (minutes) {
            const now = new Date();
            const outTime = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });

            const returnTime = new Date(now.getTime() + minutes * 60 * 1000);
            const expectedReturn = returnTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });

            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            const duration = `${hours}h ${String(remainingMinutes).padStart(2, '0')}m`;
            const LatByduration = `${hours}h ${String(remainingMinutes).padStart(2, '0')}m`;

            selectedRow.find('td:eq(4)').text('Out');
            selectedRow.find('td:eq(5)').text(outTime);
            selectedRow.find('td:eq(6)').text(duration);
            selectedRow.find('td:eq(7)').text(expectedReturn);

            selectedRow.removeClass('selected-row');

            setTimeout(() => {
                this.staffMemberIsLate();
                const intervalId = setInterval(this.staffMemberIsLate, 60000);
                selectedRow.data('checkInterval', intervalId);
            }, minutes * 60 * 1000);
        }
    }

    staffIn() {
        const activeRow = $('#tableMain tbody tr.selected-row');

        if (activeRow.length === 0) {
            alert('Please select a staff member with Out status first');
            return;
        }

        if (activeRow.find('td:eq(4)').text() !== 'Out') {
            alert('Selected staff member is not Out');
            return;
        }

        const intervalId = activeRow.data('checkInterval');
        if (intervalId) {
            clearInterval(intervalId);
        }

        const image = activeRow.find('td:eq(0) img').attr('src');
        const firstName = activeRow.find('td:eq(1)').text();
        const lastName = activeRow.find('td:eq(2)').text();
        const email = activeRow.find('td:eq(3)').text();

        activeRow.html(`
            <td><img src="${image}" alt="${firstName}"></td>
            <td>${firstName}</td>
            <td>${lastName}</td>
            <td>${email}</td>
            <td>In</td>
            <td></td>
            <td></td>
            <td></td>
        `);

        activeRow.removeClass('selected-row');

        // Close the specific alert for the selected staff member
        const alertId = `staff-alert-${firstName.toLowerCase()}-${lastName.toLowerCase()}`;
        this.closedAlerts.add(alertId); // Mark the alert as closed
        $(`#${alertId}`).remove(); // Remove the specific alert from the DOM
    }

    staffUserGet() {
        $.ajax({
            url: 'https://randomuser.me/api/?results=5',
            dataType: 'json',
            success: (data) => {
                const users = data.results;
                let rows = '';

                users.forEach(user => {
                    rows += `
                        <tr>
                            <td><img src="${user.picture.thumbnail}" alt="${user.name.first}"></td>
                            <td>${user.name.first}</td>
                            <td>${user.name.last}</td>
                            <td>${user.email}</td>
                            <td>In</td>
                            <td></td>
                            <td></td>
                            <td></td>
                        </tr>
                    `;
                });

                $('#tableMain tbody').html(rows);
            },
            error: function (err) {
                console.error('Error fetching data:', err);
            }
        });
    }

    staffMemberIsLate() {
        const now = new Date();
        const currentTime = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        $('#tableMain tbody tr').each(function() {
            const status = $(this).find('td:eq(4)').text();
            const expectedReturn = $(this).find('td:eq(7)').text();
            const name = $(this).find('td:eq(1)').text();
            const alertId = `staff-alert-${name.toLowerCase().replace(/\s+/g, '-')}`;
            const image = $(this).find('td:eq(0) img').attr('src');
            const duration = $(this).find('td:eq(6)').text();

            // Skip if this alert was closed
            if (dashboard.closedAlerts.has(alertId)) {
                return;
            }

            // Check if the alert has already been shown
            if (status === 'Out' && expectedReturn && expectedReturn < currentTime && !dashboard.alertShown[alertId]) {
                dashboard.alertShown[alertId] = true; // Mark alert as shown

                const expectedTime = new Date();
                const [hours, minutes] = expectedReturn.split(':');
                expectedTime.setHours(hours, minutes, 0);
                
                const lateMinutes = Math.floor((now - expectedTime) / (1000 * 60));
                const lateHours = Math.floor(lateMinutes / 60);
                const remainingMinutes = lateMinutes % 60;
                const lateDuration = `${lateHours}h ${String(remainingMinutes).padStart(2, '0')}m`;

                const lateTime = expectedTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
                const alertMessage = `
                    <div class="staff-late-alert" id="${alertId}">
                        <button type="button" class="btn-close float-end" onclick="dashboard.closeAlert('${alertId}')"></button>
                        <img src="${image}" alt="${name}" class="mb-2"><br>
                        <strong>${name}</strong> is late<br>
                        <span class="late-duration">Late by: ${duration}</span>
                    </div>
                `;
                $('#alertBox').append(alertMessage);
            }
        });
    }

    toggleDropdown(event) {
        const dropdownMenu = document.getElementById('dropdown-menu');
        const rect = event.target.getBoundingClientRect();
        
        dropdownMenu.style.left = `${rect.left}px`;
        dropdownMenu.style.top = `${rect.bottom + window.scrollY}px`;

        dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
    }

    closeDropdownOnClickOutside(event) {
        const dropdownMenu = document.getElementById('dropdown-menu');
        if (!event.target.closest('#header') && !event.target.closest('.dropdown-menu')) {
            dropdownMenu.style.display = 'none';
        }
    }

    digitalClock() {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-based
        const year = now.getFullYear();
        const time = now.toTimeString().split(' ')[0]; // Get time in HH:MM:SS format

        document.getElementById('clock').textContent = `${day}-${month}-${year} ${time}`;
    }

    addDelivery() {
        const vehicleType = $('#DeliverytableMain select').val();
        const vehicleIcon = vehicleType === 'Motorcycle' 
            ? '<i class="fa-solid fa-motorcycle"></i>' 
            : '<i class="fa-solid fa-car"></i>';
        
        const name = $('#DeliverytableMain input[placeholder="Name"]').val().trim();
        const surname = $('#DeliverytableMain input[placeholder="Surname"]').val().trim();
        const telephone = $('#DeliverytableMain input[placeholder="Telephone"]').val().trim();
        const address = $('#DeliverytableMain input[placeholder="Delivery Address"]').val().trim();
        const returnTime = $('#returnTime').val();

        // Validation
        if (!name) {
            alert('Name is required');
            return;
        }
        if (!surname) {
            alert('Surname is required');
            return;
        }
        if (!telephone) {
            alert('Telephone is required');
            return;
        }
        if (!this.validateDelivery(telephone)) {
            alert('Please enter a valid telephone number');
            return;
        }
        if (!address) {
            alert('Delivery Address is required');
            return;
        }
        if (!returnTime) {
            alert('Return Time is required');
            return;
        }

        // Calculate the duration
        const now = new Date();
        const [returnHours, returnMinutes] = returnTime.split(':').map(Number);
        const returnDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), returnHours, returnMinutes);
        const durationMinutes = Math.floor((now - returnDate) / (1000 * 60));
        const durationHours = Math.floor(Math.abs(durationMinutes) / 60); // Use absolute value for hours
        const remainingMinutes = Math.abs(durationMinutes) % 60; // Use absolute value for minutes

        // Format the duration without negative sign
        const duration = `${durationHours}h ${remainingMinutes}m`;

        // Store the return time
        this.deliveryTimes.push(returnTime);
        const newRow = `
            <tr>
                <td>${vehicleIcon} ${vehicleType}</td>
                <td>${name}</td>
                <td>${surname}</td>
                <td>${telephone}</td>
                <td>${address}</td>
                <td>${returnTime}</td>
                <td style="color:transparent;border-left:0px;">${duration}</td>
            </tr>
        `;
        $('#DeliveryBoardtableMain tbody').append(newRow);

        // Clear the input fields
        $('#DeliverytableMain input').val('');
        $('#returnTime').val('');
        $('#DeliverytableMain select').prop('selectedIndex', 0);

        // Check for late deliveries every minute
        setInterval(this.deliveryDriverIsLate.bind(this), 60000);
    }

    deliveryDriverIsLate() {
        const now = new Date();
        const currentTime = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        $('#DeliveryBoardtableMain tbody tr').each((index, row) => {
            const time = $(row).find('td:eq(5)').text();
            const name = $(row).find('td:eq(1)').text();
            const alertId = `delivery-alert-${name.toLowerCase().replace(/\s+/g, '-')}`;
            const duration = $(row).find('td:eq(6)').text();

            // Skip if this alert was closed
            if (dashboard.closedAlerts.has(alertId)) {
                return;
            }

            // Check if the alert has already been shown
            if (time < currentTime && !dashboard.deliveryAlertShown[alertId]) {
                dashboard.deliveryAlertShown[alertId] = true; // Mark alert as shown

                const phone = $(row).find('td:eq(3)').text();
                const address = $(row).find('td:eq(4)').text();

                const expectedTime = new Date();
                const [hours, minutes] = time.split(':');
                expectedTime.setHours(hours, minutes, 0);
                
                const lateMinutes = Math.floor((now - expectedTime) / (1000 * 60));
                const lateHours = Math.floor(lateMinutes / 60);
                const remainingMinutes = lateMinutes % 60;
                const lateDuration = `${lateHours}h ${String(remainingMinutes).padStart(2, '0')}m`;

                const lateTime = expectedTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
                const alertMessage = `
                    <div class="delivery-late-alert" id="${alertId}">
                        <button type="button" class="btn-close float-end" onclick="dashboard.closeAlert('${alertId}')"></button>
                        <strong>${name}</strong> is late<br>
                        <span class="late-duration">Late by: ${duration}</span><br>
                         <span><strong>Phone:</strong> ${phone} <span><br>
                        <span><strong>Address:</strong> ${address}</span>
                    </div>
                `;
                $('#alertBox').append(alertMessage);
            }
        });
    }

    showAlert(message) {
        const alertBox = $('#deliveryAlert');
        alertBox.text(message);
        alertBox.fadeIn();
        setTimeout(() => {
            alertBox.fadeOut();
        }, 30000000);
    }

    validateDelivery(phone) {
        const phoneRegex = /^\+?[\d\s-]{7,}$/;
        return phoneRegex.test(phone);
    }

    selectDeliveryRow() {
        $('#DeliveryBoardtableMain tbody tr').removeClass('selected-delivery-row');
        $(this).addClass('selected-delivery-row');
    }

    handleDeliveryClear() {
        const selectedRow = $('#DeliveryBoardtableMain tbody tr.selected-delivery-row');
        if (selectedRow.length === 0) {
            alert('Please select a delivery row to clear');
            return;
        }
        
        // Get the name from the selected row and clear its alert from closedAlerts
        const name = selectedRow.find('td:eq(1)').text();
        const alertId = `delivery-alert-${name.toLowerCase().replace(/\s+/g, '-')}`;
        this.closedAlerts.delete(alertId);
        
        selectedRow.remove();
    }

    // Add this new method to handle alert closing
    closeAlert(alertId) {
        this.closedAlerts.add(alertId);
        $(`#${alertId}`).remove();
    }
}

const dashboard = new Dashboard();