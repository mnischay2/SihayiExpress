document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Get DOM Elements ---
    const printForm = document.getElementById('print-form');
    const fileInput = document.getElementById('file-input');
    const fileSelect = document.getElementById('file-select');
    const orientationSelect = document.getElementById('orientation');
    const paperSizeSelect = document.getElementById('paper-size');
    const appQueueBody = document.getElementById('app-queue-body');
    const osQueueBody = document.getElementById('os-queue-body');

    // --- 2. Data Loading Functions ---
    const loadFiles = async (selectFilename) => {
        try {
            const { files } = await api.getFiles();
            ui.renderFiles(files);
            if (selectFilename) {
                fileSelect.value = selectFilename;
                // Trigger preview for the newly uploaded file
                await triggerPreview();
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

    // --- 3. Preview Logic ---
    const triggerPreview = async () => {
        const filename = fileSelect.value;
        if (!filename || filename === '--upload--') {
            // Don't render a preview if no file is selected
            return;
        }

        ui.showPreviewLoading();

        const options = {
            paperSize: paperSizeSelect.value,
            orientation: orientationSelect.value === '4' ? 'landscape' : 'portrait',
        };

        const fileUrl = `/uploads/${filename}`;
        const extension = filename.split('.').pop().toLowerCase();

        try {
            if (extension === 'pdf') {
                await ui.renderPdfPreview(fileUrl, options);
            } else if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
                ui.renderImagePreview(fileUrl, options);
            } else {
                ui.renderUnsupportedPreview(filename);
            }
        } catch (err) {
            ui.renderUnsupportedPreview(filename);
            ui.showStatus(`Failed to generate preview: ${err.message}`, 'error');
            console.error(err);
        }
    };

    // --- 4. Event Handlers ---
    fileSelect.addEventListener('change', () => {
        if (fileSelect.value === '--upload--') {
            fileInput.click();
        } else {
            triggerPreview();
        }
    });

    orientationSelect.addEventListener('change', triggerPreview);
    paperSizeSelect.addEventListener('change', triggerPreview);

    fileInput.addEventListener('change', async () => {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const formData = new FormData();
            formData.append('file', file);

            try {
                const data = await api.uploadFile(formData);
                ui.showStatus(data.message);
                await loadFiles(file.name);
            } catch (err) {
                ui.showStatus(err.message, 'error');
                fileSelect.selectedIndex = 0;
            } finally {
                fileInput.value = '';
            }
        } else {
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

    // --- 5. Initialization ---
    console.log('SihayiExpress App Initialized');
    loadAll(); // Initial data load
    setInterval(loadAll, 3000); // Poll for updates every 3 seconds

    const adjustPreviewHeight = () => {
        const startNewJobBox = document.getElementById('start-new-job-box');
        const previewContainer = document.getElementById('preview-container');
        if (startNewJobBox && previewContainer) {
            const height = startNewJobBox.offsetHeight;
            previewContainer.style.maxHeight = `${height}px`;
        }
    };

    // Adjust height on load
    window.addEventListener('load', adjustPreviewHeight);
    // Adjust height on resize
    window.addEventListener('resize', adjustPreviewHeight);
});