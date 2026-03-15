import { db } from "../db";

const IPS   = ["192.168.1.50", "45.33.22.11", "10.0.0.5", "88.12.34.56", "172.16.0.22"];
const USERS = ["admin", "root", "guest", "user1", "db_admin"];

// Normal HTTP paths — varied enough to also trip the path-scanning rule
const HTTP_PATHS = [
  "/login", "/api/user", "/admin/config", "/api/v1/data",
  "/dashboard", "/api/settings", "/profile", "/api/logs",
  "/reports", "/api/stats", "/search", "/api/export"
];

// Attack paths that will match the web-attack SQL patterns in detection.ts
const ATTACK_PATHS = [
  "/admin?id=1' OR 1=1 --",
  "/cgi-bin/test.sh?cmd=;cat /etc/passwd",
  "/login?user=<script>alert(1)</script>",
  "/api/v1/upload?file=../../etc/shadow",
  "/search?q=UNION SELECT * FROM users--"
];

// Fixed IPs for attack simulation
const BRUTE_FORCE_IP = "45.33.22.11";
const WEB_ATTACK_IP  = "88.12.34.56";
const SCANNER_IP     = "10.0.0.5";

export function startLogSimulator() {
  console.log("Log Simulator started...");

  // Main simulator: every 2 seconds
  // Distribution: 50% normal, 30% brute force, 20% web attack
  setInterval(() => {
    const roll = Math.random();
    if (roll < 0.50) {
      generateNormalLog();
    } else if (roll < 0.80) {
      // Generate 2 brute-force logs per tick to hit threshold faster
      generateBruteForceLog();
      generateBruteForceLog();
    } else {
      generateAttackLog();
    }
  }, 2000);

  // Extra scanner traffic every 4 seconds to trip the path-scanning rule
  setInterval(() => {
    generateScannerLog();
  }, 4000);
}

function generateNormalLog() {
  const ip   = IPS[Math.floor(Math.random() * IPS.length)];
  const path = HTTP_PATHS[Math.floor(Math.random() * 6)]; // first 6 are benign
  db.prepare(`
    INSERT INTO logs (source_ip, service, event_type, status, request_path, raw_log)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(ip, "http", "access", "200", path, `GET ${path} HTTP/1.1 200 OK from ${ip}`);
}

function generateBruteForceLog() {
  const user = USERS[Math.floor(Math.random() * USERS.length)];
  db.prepare(`
    INSERT INTO logs (source_ip, service, username, event_type, status, raw_log, severity)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    BRUTE_FORCE_IP,
    "ssh",
    user,
    "auth_failure",
    "401",
    `Failed password for ${user} from ${BRUTE_FORCE_IP} port 22 ssh2`,
    "warning"
  );
}

function generateAttackLog() {
  const path = ATTACK_PATHS[Math.floor(Math.random() * ATTACK_PATHS.length)];
  db.prepare(`
    INSERT INTO logs (source_ip, service, event_type, status, request_path, raw_log, severity)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    WEB_ATTACK_IP,
    "http",
    "web_attack",
    "403",
    path,
    `GET ${path} HTTP/1.1 403 Forbidden from ${WEB_ATTACK_IP}`,
    "critical"
  );
}

// Rotates through many distinct paths to trip the path-scanning rule
let scanPathIndex = 0;
function generateScannerLog() {
  const path = HTTP_PATHS[scanPathIndex % HTTP_PATHS.length];
  scanPathIndex++;
  db.prepare(`
    INSERT INTO logs (source_ip, service, event_type, status, request_path, raw_log)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    SCANNER_IP,
    "http",
    "access",
    "200",
    path,
    `GET ${path} HTTP/1.1 200 OK from ${SCANNER_IP}`
  );
}
