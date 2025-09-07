const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const PORT = 5000;

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
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded or file type not allowed' });
    }
    res.json({ message: 'File uploaded successfully', filename: req.file.originalname });
});

// Serve uploaded files
app.use('/uploads', express.static(UPLOAD_FOLDER));

// API to list uploaded files as JSON
app.get('/api/uploads', (req, res) => {
    fs.readdir(UPLOAD_FOLDER, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to list files' });
        }
        // Filter only allowed extensions
        const filtered = files.filter(file => allowedExtensions.includes(path.extname(file).toLowerCase()));
        res.json({ files: filtered });
    });
});

// Get list of printers
app.get('/printers', (req, res) => {
    exec('lpstat -p -d', (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: 'Failed to get printers', details: stderr });
        }
        // Parse printer names from lpstat output
        const printers = [];
        const lines = stdout.split('\n');
        lines.forEach(line => {
            const match = line.match(/^printer\s+(\S+)/);
            if (match) {
                printers.push(match[1]);
            }
        });
        res.json({ printers });
    });
});

// Submit print job
app.post('/print', (req, res) => {
    const { filename, printer, options } = req.body;
    if (!filename || !printer) {
        return res.status(400).json({ error: 'Missing filename or printer' });
    }
    const filepath = path.join(UPLOAD_FOLDER, filename);
    if (!fs.existsSync(filepath)) {
        return res.status(400).json({ error: 'File does not exist' });
    }

    // Build lp command with options
    let cmd = `lp -d ${printer} `;

    if (options) {
        if (options.copies) {
            cmd += `-n ${options.copies} `;
        }
        if (options.duplex) {
            cmd += `-o sides=${options.duplex} `;
        }
        if (options.orientation) {
            cmd += `-o orientation-requested=${options.orientation} `;
        }
        if (options.color) {
            cmd += `-o ColorModel=${options.color} `;
        }
        if (options.paperSize) {
            cmd += `-o media=${options.paperSize} `;
        }
    }

    cmd += `"${filepath}"`;

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: 'Failed to print', details: stderr });
        }
        res.json({ message: 'Print job submitted', jobId: stdout.trim() });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// API to delete an uploaded file (moved here after app is defined)
app.delete('/api/uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(UPLOAD_FOLDER, filename);
    if (!allowedExtensions.includes(path.extname(filename).toLowerCase())) {
        return res.status(400).json({ error: 'File type not allowed' });
    }
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    fs.unlink(filepath, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete file' });
        }
        res.json({ message: 'File deleted successfully' });
    });
});
