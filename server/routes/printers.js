const express = require('express');
const util = require('util');
const { exec } = require('child_process');

const router = express.Router();
const execPromise = util.promisify(exec);

// GET /api/printers
router.get('/printers', async (req, res) => {
    try {
        const { stdout } = await execPromise('lpstat -p -d');
        const printers = stdout.split('\n')
            .map(line => line.match(/^printer\s+(\S+)/))
            .filter(match => match)
            .map(match => match[1]);
        res.json({ printers });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get printers' });
    }
});

// GET /api/queue (OS Queue)
router.get('/queue', async (req, res) => {
    try {
        const { stdout } = await execPromise('lpstat -o');
        const jobs = stdout.split('\n').filter(l => l.trim() !== '').map(l => {
            const parts = l.split(/\s+/);
            return { id: parts[0], owner: parts[1], status: parts.slice(2).join(' ') };
        });
        res.json({ jobs });
    } catch (error) {
        if (error.stderr && error.stderr.includes("no entries")) return res.json({ jobs: [] });
        res.status(500).json({ error: 'Failed to get print queue' });
    }
});

// DELETE /api/queue/:jobId (Cancel OS Job)
router.delete('/queue/:jobId', async (req, res) => {
    const jobId = req.params.jobId.replace(/[^a-zA-Z0-9\-]/g, '');
    if (!jobId) return res.status(400).json({ error: 'Invalid Job ID' });
    try {
        await execPromise(`cancel ${jobId}`);
        res.json({ message: `Job '${jobId}' cancelled.` });
    } catch (error) {
        res.status(500).json({ error: `Failed to cancel job.`, details: error.stderr });
    }
});

module.exports = router;