const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const fsPromises = require('fs').promises;
const { exec, spawn } = require('child_process');
const util = require('util');

const app = express();
const PORT = 5000;
const execPromise = util.promisify(exec);

const UPLOAD_FOLDER = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_FOLDER)) {
    fs.mkdirSync(UPLOAD_FOLDER);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_FOLDER);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const allowedExtensions = ['.pdf', '.docx', '.pptx'];

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
            'output-order': options.order, // e.g., 'normal', 'reverse'
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
        if (code !== 0) {
            console.error(`Print command failed with code ${code}:`, stderrData);
            return res.status(500).json({ error: 'Failed to submit print job.', details: stderrData.trim() });
        }
        res.json({ message: 'Print job submitted successfully', jobId: stdoutData.trim() });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// API to delete an uploaded file (moved here after app is defined)
app.delete('/api/uploads/:filename', async (req, res) => {
    // Sanitize filename to prevent directory traversal
    const filename = path.basename(req.params.filename);
    const filepath = path.join(UPLOAD_FOLDER, filename);

    try {
        // Check if file exists before attempting to delete
        await fsPromises.access(filepath);
        await fsPromises.unlink(filepath);
        res.json({ message: `File '${filename}' deleted successfully.` });
    } catch (err) {
        if (err.code === 'ENOENT') {
            return res.status(404).json({ error: 'File not found' });
        }
        console.error(`Failed to delete file ${filename}:`, err);
        return res.status(500).json({ error: 'Failed to delete file' });
    }
});