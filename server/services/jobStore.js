const fsPromises = require('fs').promises;
const path = require('path');

// Database file will live in the root of the project
const JOB_DB_FILE = path.join(__dirname, '../../jobs.json');
let jobStore = {}; // In-memory cache

async function loadJobsFromDisk() {
    try {
        await fsPromises.access(JOB_DB_FILE);
        const data = await fsPromises.readFile(JOB_DB_FILE, 'utf-8');
        jobStore = JSON.parse(data);
        console.log("[JobStore] Loaded jobs database from disk.");
        return jobStore;
    } catch (error) {
        console.log("[JobStore] No job database found. Starting fresh.");
        jobStore = {};
        return jobStore;
    }
}

async function saveJobsToDisk() {
    try {
        await fsPromises.writeFile(JOB_DB_FILE, JSON.stringify(jobStore, null, 2), 'utf-8');
    } catch (error) {
        console.error("[JobStore] CRITICAL: Failed to save job database!", error);
    }
}

// Load jobs on module start
loadJobsFromDisk();

module.exports = {
    getJobStore: () => jobStore,
    getJobById: (jobId) => jobStore[jobId],
    updateJob: (jobId, jobData) => {
        jobStore[jobId] = jobData;
        saveJobsToDisk(); // Save on every update
    },
    getAllJobsSorted: () => {
        return Object.values(jobStore)
            .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    }
};