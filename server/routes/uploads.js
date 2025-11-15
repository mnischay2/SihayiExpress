const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;

const router = express.Router();
const allowedExtensions = ['.pdf', '.docx', '.pptx', '.jpg', '.jpeg', '.png'];

// We pass UPLOAD_FOLDER and TRASH_FOLDER from server.js
// This makes the module more testable and less reliant on its own path logic
module.exports = (UPLOAD_FOLDER, TRASH_FOLDER) => {
    
    // --- Multer Setup (File Uploads) ---
    const storage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, UPLOAD_FOLDER),
        filename: (req, file, cb) => cb(null, file.originalname)
    });
    const fileFilter = (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        allowedExtensions.includes(ext) ? cb(null, true) : cb(new Error('File type not allowed'), false);
    };
    const upload = multer({ storage, fileFilter });

    // POST /api/upload
    router.post('/upload', (req, res) => {
        upload.single('file')(req, res, (err) => {
            if (err) return res.status(400).json({ error: err.message });
            if (!req.file) return res.status(400).json({ error: 'No file was uploaded.' });
            res.json({ message: 'File uploaded successfully', filename: req.file.originalname });
        });
    });

    // GET /api/uploads
    router.get('/uploads', async (req, res) => {
        try {
            const files = await fsPromises.readdir(UPLOAD_FOLDER);
            const filtered = files.filter(file => allowedExtensions.includes(path.extname(file).toLowerCase()));
            res.json({ files: filtered });
        } catch (err) {
            res.status(500).json({ error: 'Failed to list files' });
        }
    });

    // DELETE /api/uploads/:filename
    router.delete('/uploads/:filename', async (req, res) => {
        const filename = path.basename(req.params.filename);
        const sourcePath = path.join(UPLOAD_FOLDER, filename);
        const destPath = path.join(TRASH_FOLDER, filename);
        try {
            await fsPromises.rename(sourcePath, destPath);
            res.json({ message: `File '${filename}' moved to trash.` });
        } catch (err) {
            res.status(500).json({ error: 'Failed to delete file' });
        }
    });

    return router;
};