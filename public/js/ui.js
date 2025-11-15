// This file contains all functions for updating the DOM.
// It is a "dumb" file; it just takes data and renders HTML.

const ui = {
    // --- Get Element References ---
    statusMessage: document.getElementById('status-message'),
    fileNameSpan: document.getElementById('file-name'),
    fileInput: document.getElementById('file-input'),
    fileSelect: document.getElementById('file-select'),
    printerSelect: document.getElementById('printer-select'),
    appQueueBody: document.getElementById('app-queue-body'),
    osQueueBody: document.getElementById('os-queue-body'),
    // REQ-003: Add modal elements
    previewModal: document.getElementById('preview-modal'),
    previewFrame: document.getElementById('preview-frame'),
    modalCloseBtn: document.getElementById('modal-close-btn'),

    /**
     * Shows a global status message.
     * @param {string} message - The text to display.
     * @param {string} type - 'success' or 'error'.
     */
    showStatus: (message, type = 'success') => {
        ui.statusMessage.textContent = message;
        ui.statusMessage.className = `p-4 rounded-md mb-4 text-sm ${
            type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`;
        setTimeout(() => (ui.statusMessage.className = 'hidden'), 4000);
    },

    /**
     * Renders the file <select> dropdown.
     */
    renderFiles: (files) => {
        const currentVal = ui.fileSelect.value;
        ui.fileSelect.innerHTML = '<option value="">-- Select a file --</option>';
        files.forEach(file => {
            ui.fileSelect.innerHTML += `<option value="${file}">${file}</option>`;
        });
        // Re-select old value if it's still there
        if (files.includes(currentVal)) {
            ui.fileSelect.value = currentVal;
        }
    },

    /**
     * Renders the printer <select> dropdown.
     */
    renderPrinters: (printers) => {
        const currentVal = ui.printerSelect.value;
        ui.printerSelect.innerHTML = '<option value="">-- Select a printer --</option>';
        printers.forEach(printer => {
            ui.printerSelect.innerHTML += `<option value="${printer}">${printer}</option>`;
        });
        if (printers.includes(currentVal)) {
            ui.printerSelect.value = currentVal;
        }
    },

    /**
     * Renders the application job history table.
     */
    renderAppJobs: (jobs) => {
        if (jobs.length === 0) {
            ui.appQueueBody.innerHTML = '<tr><td colspan="5" class="td-empty">No print jobs in history.</td></tr>';
            return;
        }
        ui.appQueueBody.innerHTML = jobs.map(job => `
            <tr>
                <td class="td"><span class="status-badge status-${job.status}">${job.status}</span></td>
                <td class="td">${job.filename}</td>
                <td class="td">${job.printer}</td>
                <td class="td">${new Date(job.submittedAt).toLocaleString()}</td>
                <td class="td text-right">
                    ${job.status === 'pending' ? 
                        `<button data-job-id="${job.id}" class="btn btn-danger btn-sm cancel-app-job">Cancel</button>` : ''}
                </td>
            </tr>
        `).join('');
    },

    /**
     * Renders the OS active queue table.
     */
    renderOsQueue: (jobs) => {
        if (jobs.length === 0) {
            ui.osQueueBody.innerHTML = '<tr><td colspan="4" class="td-empty">No active jobs in OS queue.</td></tr>';
            return;
        }
        ui.osQueueBody.innerHTML = jobs.map(job => `
            <tr>
                <td class="td">${job.id}</td>
                <td class="td">${job.owner}</td>
                <td class="td">${job.status}</td>
                <td class="td text-right">
                    <button data-job-id="${job.id}" class="btn btn-danger btn-sm cancel-os-job">Cancel</button>
                </td>
            </tr>
        `).join('');
    },

    /**
     * Resets the file input form.
     */
    resetUploadForm: () => {
        ui.fileNameSpan.textContent = 'Click to select a file';
        ui.fileNameSpan.classList.remove('text-indigo-600');
        ui.fileInput.value = ''; // Clear the file input
    },

    // --- REQ-003: Modal Functions ---
    /**
     * Shows the preview modal and sets the iframe source.
     * @param {string} src - The URL for the iframe (e.g., /uploads/file.pdf)
     */
    showPreviewModal: (src) => {
        ui.previewFrame.src = src;
        ui.previewModal.classList.remove('modal-hidden');
    },

    /**
     * Hides the preview modal and clears the iframe source.
     */
    hidePreviewModal: () => {
        ui.previewModal.classList.add('modal-hidden');
        ui.previewFrame.src = 'about:blank'; // Stop content from loading
    }
};