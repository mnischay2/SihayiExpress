document.addEventListener('DOMContentLoaded', () => {
    const printerSelect = document.getElementById('printerSelect');
    const fileSelect = document.getElementById('fileSelect');
    const printForm = document.getElementById('printForm');
    const messageDiv = document.getElementById('message');

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

    // Load uploaded files from backend uploads folder
    fetch('http://localhost:5000/uploads/')
        .then(response => response.text())
        .then(html => {
            // Parse the directory listing HTML to extract filenames
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const links = doc.querySelectorAll('a');
            fileSelect.innerHTML = '';
            if (links.length > 0) {
                links.forEach(link => {
                    const filename = link.textContent;
                    if (filename !== '../') {
                        const option = document.createElement('option');
                        option.value = filename;
                        option.textContent = filename;
                        fileSelect.appendChild(option);
                    }
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

    printForm.addEventListener('submit', (e) => {
        e.preventDefault();
        messageDiv.textContent = '';
        messageDiv.className = '';

        const filename = fileSelect.value;
        const printer = printerSelect.value;
        const copies = document.getElementById('copiesInput').value;
        const duplex = document.getElementById('duplexSelect').value;
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
            duplex: duplex,
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
