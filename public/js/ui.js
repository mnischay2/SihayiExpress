// This file contains all functions for updating the DOM.
// It is a "dumb" file; it just takes data and renders HTML.

const ui = {
    // --- Get Element References ---
    statusMessage: document.getElementById('status-message'),
    fileInput: document.getElementById('file-input'),
    fileSelect: document.getElementById('file-select'),
    printerSelect: document.getElementById('printer-select'),
    appQueueBody: document.getElementById('app-queue-body'),
    osQueueBody: document.getElementById('os-queue-body'),
    previewContent: document.getElementById('preview-content'),

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
        ui.fileSelect.innerHTML = '<option value="" disabled>-- Select a file --</option>';
        files.forEach(file => {
            ui.fileSelect.innerHTML += `<option value="${file}">${file}</option>`;
        });
        ui.fileSelect.innerHTML += '<option value="--upload--" class="text-indigo-600 font-semibold">Upload New File...</option>';
        
        // Re-select old value if it's still there
        if (files.includes(currentVal)) {
            ui.fileSelect.value = currentVal;
        } else if (!currentVal || currentVal === '--upload--') {
            // If no file was selected, or upload was just finished, select the default
            ui.fileSelect.selectedIndex = 0;
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
     * Shows a loading spinner in the preview area.
     */
    showPreviewLoading: () => {
        ui.previewContent.innerHTML = '<div class="spinner"></div>';
    },

    /**
     * Renders a placeholder for file types that cannot be previewed.
     */
    renderUnsupportedPreview: (filename) => {
        ui.previewContent.innerHTML = `
            <div class="preview-page preview-page--letter preview-page--portrait" style="transform: scale(0.8); padding: 2rem;">
                <div class="preview-page__placeholder">
                    <p class="font-semibold">Preview not available</p>
                    <p class="text-sm">${filename}</p>
                </div>
            </div>
        `;
    },

    /**
     * Renders each page of a PDF onto a canvas element.
     * @param {string} fileUrl - The URL of the PDF file.
     * @param {object} options - { paperSize, orientation }
     */
    renderPdfPreview: async (fileUrl, options) => {
        ui.previewContent.innerHTML = ''; // Clear previous content

        const pdf = await pdfjsLib.getDocument(fileUrl).promise;
        const numPages = pdf.numPages;
        const isColor = options.colorModel === 'Color';

        let pageNumbers = Array.from({ length: numPages }, (_, i) => i + 1);

        if (options.pageSet === 'odd') {
            pageNumbers = pageNumbers.filter(n => n % 2 !== 0);
        } else if (options.pageSet === 'even') {
            pageNumbers = pageNumbers.filter(n => n % 2 === 0);
        }

        if (options.outputOrder === 'reverse') {
            pageNumbers.reverse();
        }

        for (const pageNum of pageNumbers) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 3 }); // High-res

            const pageDiv = document.createElement('div');
            pageDiv.className = `preview-page preview-page--${options.paperSize.toLowerCase()} preview-page--${options.orientation}`;
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'preview-page__content';
            if (!isColor) {
                contentDiv.style.filter = 'grayscale(1)';
            }

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext('2d');

            contentDiv.appendChild(canvas);
            pageDiv.appendChild(contentDiv);
            ui.previewContent.appendChild(pageDiv);

            await page.render({ canvasContext: context, viewport }).promise;
        }
    },

    /**
     * Renders a preview for a single image file.
     * @param {string} fileUrl - The URL of the image.
     * @param {object} options - { paperSize, orientation, colorModel }
     */
    renderImagePreview: (fileUrl, options) => {
        const isColor = options.colorModel === 'Color';
        ui.previewContent.innerHTML = `
            <div class="preview-page preview-page--${options.paperSize.toLowerCase()} preview-page--${options.orientation}">
                <div class="preview-page__content" style="${!isColor ? 'filter: grayscale(1);' : ''}">
                    <img src="${fileUrl}" alt="Preview">
                </div>
            </div>
        `;
    }
};