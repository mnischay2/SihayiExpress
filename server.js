const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initializePrintWorker } = require('./server/services/printWorker');

// --- 1. Configuration & Setup ---
const app = express();
const PORT = 5354; // The one and only port for this app

// --- 2. Create Required Directories ---
// We base all paths from __dirname (the location of server.js)
const UPLOAD_FOLDER = path.join(__dirname, 'uploads');
const TRASH_FOLDER = path.join(__dirname, 'trash');
[UPLOAD_FOLDER, TRASH_FOLDER].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
});

// --- 3. Middleware ---
app.use(cors()); // Allow API calls
app.use(express.json()); // Parse JSON bodies

// --- 4. API Routes ---
// Tell Express to use our modular route files.
// All API routes will be prefixed with /api
const uploadRoutes = require('./server/routes/uploads');
const printerRoutes = require('./server/routes/printers');
const printRoutes = require('./server/routes/print');

app.use('/api', uploadRoutes(UPLOAD_FOLDER, TRASH_FOLDER));
app.use('/api', printerRoutes);
app.use('/api', printRoutes(UPLOAD_FOLDER));

// --- 5. Frontend Static Serving ---
// Serve the /public directory as the root for static files (html, css, js)
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files from the /uploads directory
app.use('/uploads', express.static(UPLOAD_FOLDER));

// --- 6. Main Frontend Route ---
// All other GET requests will serve the main index.html file.
// This allows the frontend to be a "Single Page Application".
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- 7. Start Server ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SihayiExpress] Server running on http://localhost:${PORT}`);
    // Initialize the print worker service, passing it the uploads folder path
    initializePrintWorker(UPLOAD_FOLDER);
});