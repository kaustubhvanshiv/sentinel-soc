# Sentinel SOC - Log Analysis & SIEM

A modern, lightweight Security Operations Center (SOC) and Security Information and Event Management (SIEM) tool. Built with a Node.js backend acting as a real-time detection engine and a React frontend for analyzing logs, managing alerts, and tracking IP intelligence.

## 🚀 Key Features Implemented So Far

### 1. Real-time Detection Engine
The backend actively monitors and analyzes incoming logs to detect potential threats using custom correlation rules:
- **SSH Brute Force Detection**: Triggers high-severity alerts if more than 5 failed login attempts occur from a single IP within a 2-minute window.
- **Suspicious IP Activity (Port Scanning / Directory Fuzzing)**: Identifies if a single IP rapidly accesses more than 10 unique endpoints.
- **Web Attack Detection**: Scans request paths for malicious payloads, including:
  - SQL Injection (`OR 1=1`, `UNION SELECT`)
  - Command Injection (`/etc/passwd`, `;cat`)
  - Cross-Site Scripting (XSS) (`<script>`)

### 2. Interactive SOC Dashboard (Frontend)
A responsive, dark-mode specialized interface built for security analysts using React, Tailwind CSS, and Recharts.
- **Live Updates**: Utilizes WebSockets (Socket.IO) to push new alerts to the dashboard instantly.
- **Dashboard View**: High-level overview showing total logs ingested, active alerts, severity breakdowns, top attacking IPs, and a 24-hour event timeline.
- **Log Explorer**: Searchable, filterable view of all simulated and ingested network logs.
- **Alert Management**: Detailed views of security incidents where analysts can investigate related logs and update incident statuses (Open, Investigating, Resolved).
- **IP Intelligence**: Tracks malicious IPs, recording attack frequency and first/last seen timestamps.

### 3. Backend Architecture & Simulation
- **Server**: Node.js and Express RESTful API.
- **Database**: SQLite (`better-sqlite3`) for fast, zero-config relational data storage. Stores Users, Logs, Alerts, and IP Intelligence records.
- **Log Simulator Engine**: Automatically generates realistic network traffic in the background. It randomly produces normal HTTP logs, targeted SSH brute-force attempts, and web attacks to actively demonstrate the detection engine capabilities without needing external log shippers.

## 🛠️ Technology Stack
- **Frontend**: React 19, Vite, Tailwind CSS (v4), Recharts.
- **Styling & UI**: Lucide React (Icons), Framer Motion (Animations), custom dark theme tailored for SIEMs.
- **Backend / API**: Node.js, Express, Socket.IO.
- **Database**: SQLite.
- **Language**: TypeScript across both ends.

## 💻 Run Locally

**Prerequisites:** Node.js (v20+ recommended)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set configuration (Optional):**
   Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key if required by local integrations.

3. **Start the application:**
   ```bash
   npm run dev
   ```

4. **Access the Dashboard:**
   Open your browser and navigate to: `http://localhost:3000`

Upon starting, the **Log Simulator** and **Detection Engine** will begin automatically, populating the dashboard with data and alerts within seconds.
