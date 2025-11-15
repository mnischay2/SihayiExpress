// This file contains all functions for making API calls to the backend.
// All API calls use the relative path '/api/...', which works
// because the frontend is served from the same domain as the backend.

const api = {
    /**
     * Helper for handling fetch responses
     */
    handleResponse: async (response) => {
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Server error');
        }
        return response.json();
    },

    /**
     * Gets the list of uploaded files.
     */
    getFiles: () => fetch('/api/uploads').then(api.handleResponse),

    /**
     * Gets the list of available printers.
     */
    getPrinters: () => fetch('/api/printers').then(api.handleResponse),

    /**
     * Gets the application's job history.
     */
    getAppJobs: () => fetch('/api/jobs').then(api.handleResponse),

    /**
     * Gets the operating system's active print queue.
     */
    getOsQueue: () => fetch('/api/queue').then(api.handleResponse),

    /**
     * Uploads a file.
     * @param {FormData} formData - The form data containing the file.
     */
    uploadFile: (formData) => {
        return fetch('/api/upload', {
            method: 'POST',
            body: formData,
        }).then(api.handleResponse);
    },

    /**
     * Submits a new print job.
     * @param {object} jobDetails - { filename, printer, options }
     */
    submitPrintJob: (jobDetails) => {
        return fetch('/api/print', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jobDetails),
        }).then(api.handleResponse);
    },

    /**
     * Cancels a job from the application's pending queue.
     */
    cancelAppJob: (jobId) => {
        return fetch(`/api/jobs/${jobId}`, { method: 'DELETE' }).then(api.handleResponse);
    },

    /**
     * Cancels a job from the OS's active queue.
     */
    cancelOsJob: (jobId) => {
        return fetch(`/api/queue/${jobId}`, { method: 'DELETE' }).then(api.handleResponse);
    },
};