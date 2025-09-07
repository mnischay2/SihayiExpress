document.addEventListener('DOMContentLoaded', () => {
    const printerSelect = document.getElementById('printerSelect');
    const fileSelect = document.getElementById('fileSelect');
    const printForm = document.getElementById('printForm');
    const messageDiv = document.getElementById('message');
    const uploadForm = document.getElementById('uploadForm');
    const fileInput = document.getElementById('fileInput');

    // Load printers from backend
    fetch('http://localhost:5000/printers')
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
        fetch('http://localhost:5000/api/uploads')
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
                updatePrintPreview();
            })
            .catch(() => {
                fileSelect.innerHTML = '<option value="">Failed to load files</option>';
                updatePrintPreview();
            });
    }
    loadUploadedFiles();

    // Delete file logic
    const deleteFileBtn = document.getElementById('deleteFileBtn');
    deleteFileBtn.addEventListener('click', () => {
        const filename = fileSelect.value;
        if (!filename) return;
        if (!confirm(`Are you sure you want to delete ${filename}?`)) return;
        fetch(`http://localhost:5000/api/uploads/${encodeURIComponent(filename)}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                messageDiv.textContent = data.message;
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

    // Print preview logic
    const printPreview = document.getElementById('printPreview');
    function updatePrintPreview() {
        const filename = fileSelect.value;
        const printer = printerSelect.value;
        const copies = document.getElementById('copiesInput').value;
        const orientation = document.getElementById('orientationSelect').value;
        const color = document.getElementById('colorSelect').value;
        const paperSize = document.getElementById('paperSizeSelect').value;
        printPreview.innerHTML =
            `<strong>File:</strong> ${filename || 'None selected'}<br>` +
            `<strong>Printer:</strong> ${printer || 'None selected'}<br>` +
            `<strong>Copies:</strong> ${copies}<br>` +
            `<strong>Layout:</strong> ${orientation === '3' ? 'Portrait' : 'Landscape'}<br>` +
            `<strong>Paper Size:</strong> ${paperSize}<br>` +
            `<strong>Color:</strong> ${color}`;
    }
    fileSelect.addEventListener('change', updatePrintPreview);
    printerSelect.addEventListener('change', updatePrintPreview);
    document.getElementById('copiesInput').addEventListener('input', updatePrintPreview);
    document.getElementById('orientationSelect').addEventListener('change', updatePrintPreview);
    document.getElementById('colorSelect').addEventListener('change', updatePrintPreview);
    document.getElementById('paperSizeSelect').addEventListener('change', updatePrintPreview);

    uploadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        messageDiv.textContent = '';
        messageDiv.className = '';

        const file = fileInput.files[0];
        if (!file) {
            messageDiv.textContent = 'Please select a file to upload.';
            messageDiv.className = 'alert alert-danger';
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        fetch('http://localhost:5000/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                messageDiv.textContent = data.message;
                messageDiv.className = 'alert alert-success';
                // Refresh file list
                loadUploadedFiles(file.name);
            } else if (data.error) {
                messageDiv.textContent = data.error;
                messageDiv.className = 'alert alert-danger';
            }
        })
        .catch(() => {
            messageDiv.textContent = 'Failed to upload file.';
            messageDiv.className = 'alert alert-danger';
        });
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

        if (!filename || !printer) {
            messageDiv.textContent = 'Please select a printer and a file.';
            messageDiv.className = 'alert alert-danger';
            return;
        }

        const options = {
            copies: copies,
            orientation: orientation,
            color: color,
            paperSize: paperSize
        };

        fetch('http://localhost:5000/print', {
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
            } else if (data.error) {
                messageDiv.textContent = data.error;
                messageDiv.className = 'alert alert-danger';
            }
        })
        .catch(() => {
            messageDiv.textContent = 'Failed to submit print job.';
            messageDiv.className = 'alert alert-danger';
        });
    });
});
