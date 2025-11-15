// This file is the "controller" that connects the UI, API, and event listeners.

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Get DOM Elements ---
    const uploadForm = document.getElementById('upload-form');
    const printForm = document.getElementById('print-form');
    const fileInput = document.getElementById('file-input');
    const fileNameSpan = document.getElementById('file-name');
    const appQueueBody = document.getElementById('app-queue-body');
    const osQueueBody = document.getElementById('os-queue-body');

    // --- 2. Data Loading Functions ---
    const loadFiles = async () => {
        try {
            const { files } = await api.getFiles();
            ui.renderFiles(files);
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
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            fileNameSpan.textContent = fileInput.files[0].name;
            fileNameSpan.classList.add('text-indigo-600');
        } else {
            ui.resetUploadForm();
        }
    });

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (fileInput.files.length === 0) {
            ui.showStatus('Please select a file to upload.', 'error');
            return;
        }
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        try {
            const data = await api.uploadFile(formData);
            ui.showStatus(data.message);
            ui.resetUploadForm();
            loadFiles(); // Refresh file list
        } catch (err) {
            ui.showStatus(err.message, 'error');
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

    // --- 4. Initialization ---
    console.log('SihayiExpress App Initialized');
    loadAll(); // Initial data load
    setInterval(loadAll, 3000); // Poll for updates every 3 seconds
});