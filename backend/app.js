const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const fsPromises = require('fs').promises;
const { exec, spawn } = require('child_process');
const util = require('util');
const { Bonjour } = require('bonjour-service');

const app = express();
const PORT = 5000;
const execPromise = util.promisify(exec);

const UPLOAD_FOLDER = path.join(__dirname, 'uploads');
const TRASH_FOLDER = path.join(__dirname, 'trash');
const HISTORY_FILE = path.join(__dirname, 'prints.json');

[UPLOAD_FOLDER, TRASH_FOLDER].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// --- History Helper Functions ---
async function readHistory() {
    try {
        await fsPromises.access(HISTORY_FILE);
        const data = await fsPromises.readFile(HISTORY_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return []; // Return empty array if file doesn't exist or is invalid
    }
}

async function writeHistory(history) {
    await fsPromises.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_FOLDER);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const allowedExtensions = ['.pdf', '.docx', '.pptx', '.jpg', '.jpeg', '.png'];

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('File type not allowed'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

app.use(cors());
app.use(express.json());

// Upload endpoint
app.post('/upload', (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: err.message }); // Catches fileFilter error
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file was uploaded.' });
        }
        res.json({ message: 'File uploaded successfully', filename: req.file.originalname });
    });
});

// Serve uploaded files
app.use('/uploads', express.static(UPLOAD_FOLDER));

// API to list uploaded files as JSON
app.get('/api/uploads', async (req, res) => {
    try {
        const files = await fsPromises.readdir(UPLOAD_FOLDER);
        const filtered = files.filter(file => allowedExtensions.includes(path.extname(file).toLowerCase()));
        res.json({ files: filtered });
    } catch (err) {
        console.error("Failed to read uploads directory:", err);
        res.status(500).json({ error: 'Failed to list files' });
    }
});

// Get list of printers
app.get('/printers', async (req, res) => {
    try {
        const { stdout } = await execPromise('lpstat -p -d');
        const printers = [];
        stdout.split('\n').forEach(line => {
            const match = line.match(/^printer\s+(\S+)/);
            if (match) {
                printers.push(match[1]);
            }
        });
        res.json({ printers });
    } catch (error) {
        console.error("Failed to get printers:", error);
        res.status(500).json({ error: 'Failed to get printers', details: error.stderr });
    }
});

// Get print queue status
app.get('/api/queue', async (req, res) => {
    try {
        // lpstat -o lists active jobs.
        const { stdout } = await execPromise('lpstat -o');
        const jobs = stdout
            .split('\n')
            .filter(line => line.trim() !== '')
            .map(line => {
                // Example line: HP-LaserJet-123   nischay    1024   Mon 01 Jan...
                const parts = line.split(/\s+/);
                const [printer, jobId] = parts[0].lastIndexOf('-') > -1 ? parts[0].split(/-(?=[^-]+$)/) : [parts[0], 'N/A'];
                return {
                    id: parts[0],
                    owner: parts[1],
                    status: parts.slice(2).join(' '), // The rest of the line is the status/date
                };
            });
        res.json({ jobs });
    } catch (error) {
        // If lpstat returns an error because there are no jobs, send an empty array.
        if (error.stderr && error.stderr.includes("no entries")) {
            return res.json({ jobs: [] });
        }
        console.error("Failed to get print queue:", error);
        res.status(500).json({ error: 'Failed to get print queue', details: error.stderr });
    }
});

// API to cancel a print job
app.delete('/api/queue/:jobId', async (req, res) => {
    // Sanitize to prevent command injection, although job IDs are typically safe.
    const jobId = req.params.jobId.replace(/[^a-zA-Z0-9\-]/g, '');
    if (!jobId) {
        return res.status(400).json({ error: 'Invalid Job ID' });
    }
    try {
        await execPromise(`cancel ${jobId}`);
        res.json({ message: `Job '${jobId}' cancelled successfully.` });
    } catch (error) {
        res.status(500).json({ error: `Failed to cancel job '${jobId}'.`, details: error.stderr });
    }
});

// API to get print history
app.get('/api/history', async (req, res) => {
    const history = await readHistory();
    res.json({ history });
});

// Submit print job
app.post('/print', async (req, res) => {
    const { filename, printer, options } = req.body;
    if (!filename || !printer) {
        return res.status(400).json({ error: 'Missing filename or printer' });
    }

    // Sanitize filename to prevent directory traversal attacks
    const safeFilename = path.basename(filename);
    const filepath = path.join(UPLOAD_FOLDER, safeFilename);

    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'File does not exist' });
    }

    // Build lp command arguments safely to prevent command injection
    const args = ['-d', printer];

    if (options) {
        if (options.copies > 0) args.push('-n', String(options.copies));
        // CUPS standard option for page ranges is -P
        if (options.pageRanges) args.push('-P', options.pageRanges);

        // Mapping for -o options
        const cupsOptions = {
            'sides': options.duplex, // e.g., 'one-sided', 'two-sided-long-edge'
            'orientation-requested': options.orientation, // e.g., '3' (portrait), '4' (landscape)
            'media': options.paperSize, // e.g., 'A4', 'Letter'
            'ColorModel': options.color, // e.g., 'Color', 'Gray'
            'print-quality': options.quality, // e.g., '3' (draft), '4' (normal), '5' (best)
            'scaling': options.scaling, // e.g., '100' for 100%, or 'fit-to-page'
            'output-order': options.order, // e.g., 'normal', 'reverse'
            'page-set': options.pageSet, // e.g., 'odd', 'even'
        };

        Object.entries(cupsOptions).forEach(([key, value]) => {
            if (value) args.push('-o', `${key}=${value}`);
        });
    }

    args.push(filepath);

    const lp = spawn('lp', args);
    let stdoutData = '';
    let stderrData = '';
    lp.stdout.on('data', (data) => stdoutData += data.toString());
    lp.stderr.on('data', (data) => stderrData += data.toString());

    lp.on('close', (code) => {
        if (code === 0) {
            const jobId = stdoutData.trim();
            // Add to history on success
            const historyEntry = {
                jobId: jobId,
                filename: filename,
                printer: printer,
                options: options,
                timestamp: new Date().toISOString()
            };
            readHistory().then(history => {
                history.unshift(historyEntry); // Add to the beginning of the array
                writeHistory(history.slice(0, 100)); // Keep only the last 100 entries
            });
            res.json({ message: 'Print job submitted successfully', jobId: jobId });
        } else {
            console.error(`Print command failed with code ${code}:`, stderrData);
            return res.status(500).json({ error: 'Failed to submit print job.', details: stderrData.trim() });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);

    // Announce the service on the local network via mDNS (Bonjour)
    const bonjour = new Bonjour();
    bonjour.publish({ name: 'SihayiExpress Backend', type: 'http', port: PORT, host: 'sihayi.local' });
    console.log('SihayiExpress service announced on the network. You can now try accessing the frontend via http://sihayi.local:<FRONTEND_PORT>');
});

// API to "soft delete" a file by moving it to the trash
app.delete('/api/uploads/:filename', async (req, res) => {
    // Sanitize filename to prevent directory traversal
    const filename = path.basename(req.params.filename);
    const sourcePath = path.join(UPLOAD_FOLDER, filename);
    const destPath = path.join(TRASH_FOLDER, filename);

    await fsPromises.rename(sourcePath, destPath);
    res.json({ message: `File '${filename}' moved to trash.` });
})