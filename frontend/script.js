document.addEventListener('DOMContentLoaded', () => {
    // Dynamically determine backend URL based on current hostname
    const backendUrl = `${window.location.protocol}//${window.location.hostname}:5000`;
    const printerSelect = document.getElementById('printerSelect');
    const fileSelect = document.getElementById('fileSelect');
    const printForm = document.getElementById('printForm');
    const messageDiv = document.getElementById('message');
    const uploadForm = document.getElementById('uploadForm');
    const fileInput = document.getElementById('fileInput');
    const queueBody = document.getElementById('queueBody');
    const documentOptions = document.getElementById('documentOptions');
    const historyBody = document.getElementById('historyBody');
    const imageOptions = document.getElementById('imageOptions');

    // --- UI Helper Functions ---
    function showAlert(message, type = 'success') {
        const alertContainer = document.getElementById('alert-container');
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        alertContainer.append(wrapper);

        // Automatically remove the alert after 5 seconds
        setTimeout(() => {
            wrapper.remove();
        }, 5000);
    }
    // ...existing code...
    // Load printers from backend
    fetch(backendUrl + '/printers')
        .then(response => response.json())
        .then(data => {
            printerSelect.innerHTML = '';
            if (data.printers && data.printers.length > 0) {
                data.printers.forEach(printer => {
                    const option = document.createElement('option');
                    option.value = printer;
                    option.textContent = printer;
                    printerSelect.appendChild(option);
                });
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No printers found';
                printerSelect.appendChild(option);
            }
        })
        .catch(() => {
            printerSelect.innerHTML = '<option value="">Failed to load printers</option>';
        });

    // Load uploaded files from backend using new JSON API
    function loadUploadedFiles(selectedFile) {
    fetch(backendUrl + '/api/uploads')
            .then(response => response.json())
            .then(data => {
                fileSelect.innerHTML = '';
                if (data.files && data.files.length > 0) {
                    data.files.forEach(filename => {
                        const option = document.createElement('option');
                        option.value = filename;
                        option.textContent = filename;
                        if (selectedFile && filename === selectedFile) {
                            option.selected = true;
                        }
                        fileSelect.appendChild(option);
                    });
                } else {
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = 'No files found';
                    fileSelect.appendChild(option);
                }
            })
            .catch(() => {
                fileSelect.innerHTML = '<option value="">Failed to load files</option>';
            });
    }
    loadUploadedFiles();
    // Poll for file list updates every 10 seconds
    setInterval(loadUploadedFiles, 10000);

    // Delete file logic
    const deleteFileBtn = document.getElementById('deleteFileBtn');
    deleteFileBtn.addEventListener('click', () => {
        const filename = fileSelect.value;
        if (!filename) { return; }
        if (!confirm(`Are you sure you want to move '${filename}' to the trash?`)) { return; }
    fetch(`${backendUrl}/api/uploads/${encodeURIComponent(filename)}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                messageDiv.textContent = data.message; // e.g., "File moved to trash."
                messageDiv.className = 'alert alert-success';
                loadUploadedFiles();
            } else if (data.error) {
                messageDiv.textContent = data.error;
                messageDiv.className = 'alert alert-danger';
            }
        })
        .catch(() => {
            messageDiv.textContent = 'Failed to delete file.';
            messageDiv.className = 'alert alert-danger';
        });
    });

    // Print Queue Logic
    function loadPrintQueue() {
        fetch(backendUrl + '/api/queue')
            .then(response => response.json())
            .then(data => {
                queueBody.innerHTML = ''; // Clear existing queue
                if (data.jobs && data.jobs.length > 0) {
                    data.jobs.forEach(job => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${job.id}</td>
                            <td>${job.owner}</td>
                            <td>${job.status}</td>
                            <td><button class="btn btn-danger btn-sm cancel-btn" data-job-id="${job.id}">Cancel</button></td>
                        `;
                        queueBody.appendChild(row);
                    });
                } else {
                    queueBody.innerHTML = '<tr><td colspan="4" class="text-center">Print queue is empty.</td></tr>';
                }
            })
            .catch(() => {
                queueBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Failed to load print queue.</td></tr>';
            });
    }

    // Event delegation for cancel buttons
    queueBody.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('cancel-btn')) {
            const jobId = e.target.getAttribute('data-job-id');
            if (confirm(`Are you sure you want to cancel job ${jobId}?`)) {
                fetch(`${backendUrl}/api/queue/${jobId}`, { method: 'DELETE' })
                    .then(() => loadPrintQueue()); // Refresh queue after cancelling
            }
        }
    });

    // Load the queue on startup and then every 5 seconds
    loadPrintQueue();
    setInterval(loadPrintQueue, 5000);

    // Print History Logic
    function loadPrintHistory() {
        fetch(backendUrl + '/api/history')
            .then(response => response.json())
            .then(data => {
                historyBody.innerHTML = ''; // Clear existing history
                if (data.history && data.history.length > 0) {
                    data.history.forEach(entry => {
                        const row = document.createElement('tr');
                        const timestamp = new Date(entry.timestamp).toLocaleString();
                        row.innerHTML = `
                            <td>${timestamp}</td>
                            <td>${entry.filename}</td>
                            <td>${entry.printer}</td>
                            <td>${entry.options.copies || 1}</td>
                            <td>${entry.jobId}</td>
                        `;
                        historyBody.appendChild(row);
                    });
                } else {
                    historyBody.innerHTML = '<tr><td colspan="5" class="text-center">No print history found.</td></tr>';
                }
            })
            .catch(() => {
                historyBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load print history.</td></tr>';
            });
    }

    // Load history on startup
    loadPrintHistory();

    // Reusable upload function
    function uploadFile(file) {
        if (!file) {
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        // Show uploading message
        showAlert(`Uploading ${file.name}...`, 'info');

        fetch(backendUrl + '/upload', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    showAlert(data.message, 'success');
                    loadUploadedFiles(file.name); // Refresh file list and select the new file
                } else if (data.error) {
                    showAlert(data.error, 'danger');
                }
            })
            .catch(() => {
                showAlert('Failed to upload file.', 'danger');
            });
    }

    // Auto-upload when a file is selected via the button
    fileInput.addEventListener('change', () => {
        messageDiv.textContent = '';
        messageDiv.className = '';
        uploadFile(fileInput.files[0]);
    });

    // Drag and Drop Logic
    printForm.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        printForm.classList.add('dragover');
    });

    printForm.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        printForm.classList.add('dragover');
    });

    printForm.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        printForm.classList.remove('dragover');
    });

    printForm.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        printForm.classList.remove('dragover');
        const droppedFile = e.dataTransfer.files[0];
        uploadFile(droppedFile);
    });

    // Logic to show/hide custom page range input
    const pageSetSelect = document.getElementById('pageSetSelect');
    const customRangeContainer = document.getElementById('customRangeContainer');
    pageSetSelect.addEventListener('change', () => {
        if (pageSetSelect.value === 'custom') {
            customRangeContainer.style.display = 'block';
        } else {
            customRangeContainer.style.display = 'none';
        }
    });

    printForm.addEventListener('submit', (e) => {
        e.preventDefault();
        messageDiv.textContent = '';
        messageDiv.className = '';

        const filename = fileSelect.value;
        const printer = printerSelect.value;
        const copies = document.getElementById('copiesInput').value;
        const orientation = document.getElementById('orientationSelect').value;
        const color = document.getElementById('colorSelect').value;
        const paperSize = document.getElementById('paperSizeSelect').value;
        const sides = document.getElementById('sidesSelect').value;
        const scaling = document.getElementById('scalingSelect').value;

        if (!filename || !printer) {
            messageDiv.textContent = 'Please select a printer and a file.';
            messageDiv.className = 'alert alert-danger';
            return;
        }

        const options = {
            copies: copies,
            orientation: orientation,
            color: color,
            paperSize: paperSize,
            // No pageRanges or pageSet by default
            pageRanges: null,
            pageSet: null,
            sides: sides,
            scaling: scaling,
        };

        // Add page selection options
        const pageSet = pageSetSelect.value;
        if (pageSet === 'odd' || pageSet === 'even') {
            options.pageSet = pageSet;
        } else if (pageSet === 'custom') {
            options.pageRanges = document.getElementById('pageRangeInput').value;
        }

    fetch(backendUrl + '/print', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filename, printer, options })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                messageDiv.textContent = data.message;
                messageDiv.className = 'alert alert-success';
                loadPrintHistory(); // Refresh history after a successful print
            } else if (data.error) {
                // Show detailed error message from backend
                messageDiv.textContent = `Error: ${data.error} ${data.details || ''}`;
                messageDiv.className = 'alert alert-danger';
            }
        })
        .catch(() => {
            messageDiv.textContent = 'Failed to submit print job.';
            messageDiv.className = 'alert alert-danger';
        });
    });
});
