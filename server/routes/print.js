const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getJobById, updateJob, getAllJobsSorted } = require('../services/jobStore');
const { queuePrintJob, cancelPendingJob } = require('../services/printWorker');

const router = express.Router();

module.exports = (UPLOAD_FOLDER) => {

    // POST /api/print
    router.post('/print', async (req, res) => {
        const { filename, printer, options } = req.body;
        if (!filename || !printer) {
            return res.status(400).json({ error: 'Missing filename or printer' });
        }
        const safeFilename = path.basename(filename);
        if (!fs.existsSync(path.join(UPLOAD_FOLDER, safeFilename))) {
            return res.status(404).json({ error: 'File does not exist' });
        }

        const jobId = crypto.randomUUID();
        const newJob = {
            id: jobId, filename: safeFilename, printer, options: options || {},
            status: 'pending', submittedAt: new Date().toISOString(),
        };
        
        updateJob(jobId, newJob); // Add to job store
        queuePrintJob(jobId); // Add to worker queue
        
        res.status(202).json({ message: 'Print job queued', jobId, status: 'pending' });
    });

    // GET /api/jobs (App Job History)
    router.get('/jobs', (req, res) => {
        const sortedJobs = getAllJobsSorted();
        res.json({ jobs: sortedJobs.slice(0, 100) }); // Send max 100
    });

    // GET /api/jobs/:jobId
    router.get('/jobs/:jobId', (req, res) => {
        const job = getJobById(req.params.jobId);
        job ? res.json(job) : res.status(404).json({ error: 'Job not found' });
    });

    // DELETE /api/jobs/:jobId (Cancel App Job)
    router.delete('/jobs/:jobId', async (req, res) => {
        const job = getJobById(req.params.jobId);
        if (!job) return res.status(404).json({ error: 'Job not found' });

        if (job.status === 'pending') {
            const wasCancelled = cancelPendingJob(job.id);
            if (wasCancelled) {
                job.status = 'cancelled';
                job.completedAt = new Date().toISOString();
                updateJob(job.id, job); // Save change
                res.json({ message: 'Job cancelled', job });
            } else {
                res.status(400).json({ error: 'Job was not pending, could not cancel.' });
            }
        } else {
            res.status(400).json({ error: 'Job already printing or completed.' });
        }
    });

    return router;
};