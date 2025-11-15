SihayiExpress Print Server

SihayiExpress is a self-hosted, modular Node.js web application that provides a simple and modern interface for managing print jobs on a local server.

It is designed to be a standalone service or easily embedded within another application (like a portal) using an <iframe>. The backend is a robust, asynchronous API that processes print jobs in the background, providing a fast, non-blocking experience for the user.

Features

Asynchronous Print Queue: Submit print jobs instantly. The Node.js backend manages a persistent queue (jobs.json) and processes jobs one by one.

File Upload: A drag-and-drop interface to upload common file types (PDF, DOCX, PPTX, JPG, PNG).

Printer Detection: Automatically detects and lists all available printers connected to the server (via lpstat).

Expanded Print Options: A full-featured print dialog with options for:

Copies

Duplex (Two-Sided)

Color Mode (Color / Grayscale)

Orientation (Portrait / Landscape)

Paper Size (A4 / Letter)

Print Quality (Draft / Normal / Best)

Print Preview: A built-in modal to preview PDF and image files before sending them to the printer.

Queue Management:

My Job History: View the status of all jobs submitted (pending, printing, completed, failed).

OS Queue: View and cancel active jobs in the system's (CUPS) print queue.

Modular Architecture: A clean separation of concerns between the Node.js backend API (/server) and the vanilla JavaScript frontend (/public).

Tech Stack

Backend: Node.js, Express.js

Frontend: Vanilla JavaScript (ES6+), HTML5, CSS3 (no frameworks)

File Handling: Multer for file uploads.

System: Relies on a Unix-like environment with CUPS (Common Unix Printing System) installed. It uses the lp, lpstat, and cancel command-line tools.

Project Structure

/SihayiExpress/
|
|-- /server/              <-- Backend API code
|   |-- /routes/          <-- API route definitions (print.js, printers.js, uploads.js)
|   |-- /services/        <-- Backend logic (jobStore.js, printWorker.js)
|
|-- /public/              <-- Frontend (client-side) code
|   |-- /css/             <-- Plain CSS (styles.css)
|   |-- /js/              <-- Modular vanilla JS (app.js, api.js, ui.js)
|   |-- /src/
|   |   `-- /images/      <-- Logo asset (logo.png)
|   `-- index.html        <-- The main HTML Single Page Application
|
|-- /uploads/             <-- (Auto-created) Stores uploaded files
|-- /trash/               <-- (Auto-created) Stores deleted files
|
|-- jobs.json             <-- (Auto-created) The persistent job queue database
|-- package.json
`-- server.js             <-- The main server entry point


Setup and Running

Prerequisites:

Node.js (v14+)

npm

A Unix-like operating system (Linux, macOS) with CUPS installed and configured.

Installation:

Clone the repository:

git clone <your-repo-url>
cd SihayiExpress


Install dependencies:

npm install


Add your logo:
Place your company logo at SihayiExpress/public/src/images/logo.png.

Running the Server:

Start the application:

node server.js


Access the application:
Open your web browser and navigate to http://localhost:5000.

How It Works

This application runs as a single Node.js server that performs two roles:

API Server: It exposes a set of API endpoints under /api/ (e.g., /api/print, /api/uploads) that the frontend communicates with.

Web Server: It serves all static files (HTML, CSS, JS) from the /public directory, allowing it to host its own frontend.

When a user submits a print job, the following happens:

The frontend sends a POST request to /api/print with the job details.

The Node.js server immediately validates the request, creates a job ID, saves the job to jobs.json with a pending status, and returns a 202 Accepted response.

The frontend UI updates instantly.

A background "worker" (printWorker.js) running on an interval detects the pending job, pulls it from the queue, and executes the lp command to send it to the actual printer.

The worker updates the job's status to printing, and finally to completed or failed.