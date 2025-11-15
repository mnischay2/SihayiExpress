document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Get DOM Elements ---
    const printForm = document.getElementById('print-form');
    const fileInput = document.getElementById('file-input');
    const fileSelect = document.getElementById('file-select');
    const appQueueBody = document.getElementById('app-queue-body');
    const osQueueBody = document.getElementById('os-queue-body');
    const previewButton = document.getElementById('preview-button');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    // --- 2. Data Loading Functions ---
    const loadFiles = async (selectFilename) => {
        try {
            const { files } = await api.getFiles();
            ui.renderFiles(files);
            if (selectFilename) {
                fileSelect.value = selectFilename;
            }
        } catch (err) { ui.showStatus(err.message, 'error'); }
    };

    const loadPrinters = async () => {
        try {
            const { printers } = await api.getPrinters();
            ui.renderPrinters(printers);
        } catch (err) { ui.showStatus(err.message, 'error'); }
    };

    const loadAppJobs = async () => {
        try {
            const { jobs } = await api.getAppJobs();
            ui.renderAppJobs(jobs);
        } catch (err) { ui.showStatus(err.message, 'error'); }
    };

    const loadOsQueue = async () => {
        try {
            const { jobs } = await api.getOsQueue();
            ui.renderOsQueue(jobs);
        } catch (err) { ui.showStatus(err.message, 'error'); }
    };

    const loadAll = () => {
        loadFiles();
        loadPrinters();
        loadAppJobs();
        loadOsQueue();
    };

    // --- 3. Event Handlers ---
    fileSelect.addEventListener('change', () => {
        if (fileSelect.value === '--upload--') {
            fileInput.click(); // Trigger the hidden file input
        }
    });

    fileInput.addEventListener('change', async () => {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const formData = new FormData();
            formData.append('file', file);

            try {
                const data = await api.uploadFile(formData);
                ui.showStatus(data.message);
                // Refresh file list and select the newly uploaded file
                await loadFiles(file.name);
            } catch (err) {
                ui.showStatus(err.message, 'error');
                // Reset selection if upload fails
                fileSelect.selectedIndex = 0;
            } finally {
                // Reset the file input so the 'change' event fires again
                fileInput.value = '';
            }
        } else {
            // If user cancels file dialog, reset the dropdown
            fileSelect.selectedIndex = 0;
        }
    });

    printForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const jobDetails = {
            filename: document.getElementById('file-select').value,
            printer: document.getElementById('printer-select').value,
            options: {
                copies: document.getElementById('copies').value,
                duplex: document.getElementById('duplex').value,
                ColorModel: document.getElementById('color-model').value,
                'orientation-requested': document.getElementById('orientation').value,
                media: document.getElementById('paper-size').value,
                'print-quality': document.getElementById('quality').value,
            }
        };

        if (!jobDetails.filename || !jobDetails.printer) {
            ui.showStatus('Please select a file and a printer.', 'error');
            return;
        }

        try {
            const data = await api.submitPrintJob(jobDetails);
            ui.showStatus(data.message);
            loadAppJobs(); // Refresh job list
        } catch (err) {
            ui.showStatus(err.message, 'error');
        }
    });

    // Event delegation for cancel buttons
    appQueueBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('cancel-app-job')) {
            const jobId = e.target.dataset.jobId;
            if (!confirm('Are you sure you want to cancel this pending job?')) return;
            try {
                const data = await api.cancelAppJob(jobId);
                ui.showStatus(data.message);
                loadAppJobs();
            } catch (err) { ui.showStatus(err.message, 'error'); }
        }
    });

    osQueueBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('cancel-os-job')) {
            const jobId = e.target.dataset.jobId;
            if (!confirm('Are you sure you want to cancel this active OS job?')) return;
            try {
                const data = await api.cancelOsJob(jobId);
                ui.showStatus(data.message);
                loadOsQueue();
            } catch (err) { ui.showStatus(err.message, 'error'); }
        }
    });

    // --- REQ-003: Preview Button Logic ---
    previewButton.addEventListener('click', () => {
        const filename = document.getElementById('file-select').value;
        if (!filename) {
            ui.showStatus('Please select a file to preview.', 'error');
            return;
        }

        const extension = filename.split('.').pop().toLowerCase();
        const supportedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif'];

        if (supportedExtensions.includes(extension)) {
            // File is viewable in an iframe
            const fileUrl = `/uploads/${filename}`;
            ui.showPreviewModal(fileUrl);
        } else {
            // File is not viewable
            ui.showStatus('Preview is only available for PDF and image files.', 'error');
        }
    });

    modalCloseBtn.addEventListener('click', () => {
        ui.hidePreviewModal();
    });

    // --- 4. Initialization ---
    console.log('SihayiExpress App Initialized');
    loadAll(); // Initial data load
    setInterval(loadAll, 3000); // Poll for updates every 3 seconds
});