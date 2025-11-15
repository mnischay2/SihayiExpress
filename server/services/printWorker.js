const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { getJobById, updateJob, getJobStore } = require('./jobStore');

const WORKER_INTERVAL = 3000; // 3 seconds
let printQueue = [];
let isWorkerRunning = false;
let UPLOAD_FOLDER; // Will be set by initializePrintWorker

function repopulateQueue() {
    const jobStore = getJobStore();
    let requeuedCount = 0;
    for (const jobId in jobStore) {
        const job = jobStore[jobId];
        if (job.status === 'pending' || job.status === 'printing') {
            job.status = 'pending';
            printQueue.push(jobId);
            requeuedCount++;
        }
    }
    if (requeuedCount > 0) {
        console.log(`[PrintWorker] Re-queued ${requeuedCount} unfinished jobs.`);
    }
}

async function executePrintJob(job) {
    const { id, filename, printer, options } = job;
    const safeFilename = path.basename(filename);
    const filepath = path.join(UPLOAD_FOLDER, safeFilename);

    if (!fs.existsSync(filepath)) {
        job.status = 'failed'; job.error = 'File not found.';
        job.completedAt = new Date().toISOString();
        updateJob(id, job); return;
    }

    const args = ['-d', printer];
    if (options) {
        if (options.copies > 0) args.push('-n', String(options.copies));
        if (options.pageRanges) args.push('-P', options.pageRanges);
        const cupsOptions = {
            'sides': options.duplex,
            'orientation-requested': options['orientation-requested'],
            'media': options.media,
            'color-model': options['color-model'],
            'print-quality': options['print-quality'],
            'page-set': options['page-set'],
            'output-order': options['output-order'],
            'scaling': options.scaling,
        };
        Object.entries(cupsOptions).forEach(([key, value]) => {
            if (value) args.push('-o', `${key}=${value}`);
        });
    }
    args.push(filepath);

    console.log(`[PrintWorker] Starting job ${id}: lp ${args.join(' ')}`);
    const lp = spawn('lp', args);
    let stdoutData = '', stderrData = '';
    lp.stdout.on('data', (data) => stdoutData += data.toString());
    lp.stderr.on('data', (data) => stderrData += data.toString());

    lp.on('close', (code) => {
        if (code === 0) {
            job.status = 'completed'; job.osJobId = stdoutData.trim();
        } else {
            job.status = 'failed'; job.error = stderrData.trim();
        }
        job.completedAt = new Date().toISOString();
        updateJob(id, job);
    });
}

async function processPrintQueue() {
    if (isWorkerRunning || printQueue.length === 0) return;
    
    isWorkerRunning = true;
    const jobId = printQueue.shift();
    const job = getJobById(jobId);

    if (!job) {
        isWorkerRunning = false; return;
    }
    try {
        job.status = 'printing';
        job.startedAt = new Date().toISOString();
        updateJob(jobId, job);
        await executePrintJob(job);
    } catch (error) {
        job.status = 'failed';
        job.error = 'Worker failed: ' + error.message;
        job.completedAt = new Date().toISOString();
        updateJob(jobId, job);
    } finally {
        isWorkerRunning = false;
    }
}

module.exports = {
    initializePrintWorker: (uploadDir) => {
        console.log("[PrintWorker] Initializing...");
        UPLOAD_FOLDER = uploadDir; // Set the dynamic path
        repopulateQueue();
        setInterval(processPrintQueue, WORKER_INTERVAL);
        console.log(`[PrintWorker] Started. Checking queue every ${WORKER_INTERVAL}ms.`);
    },
    queuePrintJob: (jobId) => {
        printQueue.push(jobId);
        console.log(`[PrintWorker] Job ${jobId} added to queue.`);
    },
    cancelPendingJob: (jobId) => {
        const initialLength = printQueue.length;
        printQueue = printQueue.filter(id => id !== jobId);
        return printQueue.length < initialLength; // Return true if removed
    }
};