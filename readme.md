# SihayiExpress Print Server

SihayiExpress is a **self-hosted, modular Node.js web application** that provides a simple and modern interface for managing print jobs on a local server.

It can run standalone or be embedded inside another application (e.g., via an `<iframe>`).  
The backend is a fast, asynchronous API that processes print jobs in the background.

---

## 🚀 Features

### ✅ Asynchronous Print Queue
- Submit print jobs instantly.
- Backend manages a persistent queue (`jobs.json`) and processes tasks one-by-one.

### 📁 File Uploads
- Drag‑and‑drop upload UI.
- Supports **PDF, DOCX, PPTX, JPG, PNG**, and more.

### 🖨️ Printer Detection
- Auto-detects all printers using `lpstat`.

### 🎛️ Expanded Print Options
Includes:
- Copies  
- Duplex (Two-Sided)  
- Color / Grayscale  
- Orientation: Portrait / Landscape  
- Paper Size: A4 / Letter  
- Print Quality: Draft / Normal / Best  

### 👀 Print Preview
- Built‑in modal preview for PDFs and images.

### 📦 Queue Management
- **My Job History:** See pending, printing, completed, failed jobs.  
- **OS Queue:** View or cancel active CUPS print jobs.

### 🧩 Modular Architecture
- `/server` → Node.js backend API  
- `/public` → Vanilla JS frontend  

---

## 🛠️ Tech Stack

**Backend:** Node.js, Express  
**Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3  
**Uploads:** Multer  
**System:** Requires CUPS (with `lp`, `lpstat`, `cancel`)

---

## 📁 Project Structure

```
/SihayiExpress/
|
|-- /server/              
|   |-- /routes/          # API endpoints (print.js, printers.js, uploads.js)
|   |-- /services/        # Logic (jobStore.js, printWorker.js)
|
|-- /public/              
|   |-- /css/             
|   |-- /js/              
|   |-- /src/images/      # Logo (logo.png)
|   `-- index.html        
|
|-- /uploads/             # Auto-created
|-- /trash/               # Auto-created
|
|-- jobs.json             # Auto-created print queue DB
|-- package.json
`-- server.js             # Main entry point
```

---

## ⚙️ Setup & Running

### **Prerequisites**
- Node.js v14+
- npm
- Linux/macOS with **CUPS** installed

---

### **1. Clone the Repository**
```bash
git clone <your-repo-url>
cd SihayiExpress
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Add Your Logo**
Place your logo at:
```
SihayiExpress/public/src/images/logo.png
```

---

### **4. Start the Server**
```bash
node server.js
```

### **5. Access the Application**
Open:
```
http://localhost:5000
```

---

## 🔧 How It Works

SihayiExpress runs a single Node.js server that acts as:

### **1. API Server**
Endpoints under `/api/` such as:
- `/api/print`
- `/api/uploads`

### **2. Web Server**
Serves the frontend from `/public`.

---

## 🖨️ Print Job Lifecycle

1. User submits a print job.
2. Backend validates, assigns a job ID, saves it to `jobs.json`, and returns `202 Accepted`.
3. UI updates instantly.
4. Background worker (`printWorker.js`) pulls pending jobs.
5. Worker sends job to printer using `lp`.
6. Status updates: *pending → printing → completed/failed*.

---

## 📜 License
MIT (or your preferred license—edit as needed)