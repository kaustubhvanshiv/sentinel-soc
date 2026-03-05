import { db } from "../db";

const IPS = ["192.168.1.50", "45.33.22.11", "10.0.0.5", "88.12.34.56", "172.16.0.22"];
const USERS = ["admin", "root", "guest", "user1", "db_admin"];
const PATHS = ["/login", "/api/user", "/admin/config", "/etc/passwd", "/wp-admin", "/api/v1/data"];

export function startLogSimulator() {
  console.log("Log Simulator started...");
  
  // Generate a log every 2 seconds
  setInterval(() => {
    const type = Math.random();
    if (type < 0.6) {
      generateNormalLog();
    } else if (type < 0.8) {
      generateBruteForceLog();
    } else {
      generateAttackLog();
    }
  }, 2000);
}

function generateNormalLog() {
  const ip = IPS[Math.floor(Math.random() * IPS.length)];
  const path = PATHS[Math.floor(Math.random() * 3)]; // Only first 3 are "normal"
  
  db.prepare(`
    INSERT INTO logs (source_ip, service, event_type, status, request_path, raw_log)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(ip, "http", "access", "200", path, `GET ${path} HTTP/1.1 200 OK from ${ip}`);
}

function generateBruteForceLog() {
  const ip = "45.33.22.11"; // Fixed IP for easier detection in demo
  const user = USERS[Math.floor(Math.random() * USERS.length)];
  
  db.prepare(`
    INSERT INTO logs (source_ip, service, username, event_type, status, raw_log, severity)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(ip, "ssh", user, "auth_failure", "401", `Failed password for ${user} from ${ip} port 22 ssh2`, "warning");
}

function generateAttackLog() {
  const ip = "88.12.34.56";
  const attackPaths = [
    "/admin?id=1' OR 1=1 --",
    "/cgi-bin/test.sh?cmd=;cat /etc/passwd",
    "/login?user=<script>alert(1)</script>",
    "/api/v1/upload?file=../../etc/shadow"
  ];
  const path = attackPaths[Math.floor(Math.random() * attackPaths.length)];
  
  db.prepare(`
    INSERT INTO logs (source_ip, service, event_type, status, request_path, raw_log, severity)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(ip, "http", "web_attack", "403", path, `GET ${path} HTTP/1.1 403 Forbidden from ${ip}`, "critical");
}
