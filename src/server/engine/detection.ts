import { db } from "../db";
import { Server } from "socket.io";

export interface LogEntry {
  source_ip: string;
  service: string;
  username?: string;
  event_type: string;
  status: string;
  request_path?: string;
  user_agent?: string;
  raw_log: string;
  timestamp?: string;
}

const DETECTION_WINDOW_MS = 120000; // 2 minutes

export function startDetectionEngine(io: Server) {
  console.log("Detection Engine started...");

  // We'll use a simple interval or a trigger-based approach.
  // In a real system, this would be a stream processor.
  setInterval(() => {
    runRules(io);
  }, 5000);
}

async function runRules(io: Server) {
  const now = new Date().toISOString();
  const windowStart = new Date(Date.now() - DETECTION_WINDOW_MS).toISOString();

  // Rule 1: SSH Brute Force (More than 5 failed logins from same IP in 2 mins)
  const bruteForceResults = db.prepare(`
    SELECT source_ip, COUNT(*) as failed_count, GROUP_CONCAT(id) as log_ids
    FROM logs
    WHERE event_type = 'auth_failure' AND service = 'ssh' AND timestamp > ?
    GROUP BY source_ip
    HAVING failed_count >= 5
  `).all(windowStart) as any[];

  for (const result of bruteForceResults) {
    createAlert(io, {
      rule_triggered: "SSH Brute Force",
      severity: "High",
      source_ip: result.source_ip,
      description: `Detected ${result.failed_count} failed SSH login attempts in 2 minutes.`,
      related_logs: result.log_ids
    });
  }

  // Rule 2: Suspicious IP (Single IP accessing multiple endpoints rapidly)
  const suspiciousIpResults = db.prepare(`
    SELECT source_ip, COUNT(DISTINCT request_path) as path_count, GROUP_CONCAT(id) as log_ids
    FROM logs
    WHERE timestamp > ? AND request_path IS NOT NULL
    GROUP BY source_ip
    HAVING path_count > 10
  `).all(windowStart) as any[];

  for (const result of suspiciousIpResults) {
    createAlert(io, {
      rule_triggered: "Suspicious IP Activity",
      severity: "Medium",
      source_ip: result.source_ip,
      description: `IP accessed ${result.path_count} unique endpoints in a short period. Potential scanning.`,
      related_logs: result.log_ids
    });
  }

  // Rule 3: Web Attack Indicators (SQLi, Command Injection)
  const webAttacks = db.prepare(`
    SELECT id, source_ip, raw_log, request_path
    FROM logs
    WHERE timestamp > ? AND (
      request_path LIKE '%OR 1=1%' OR 
      request_path LIKE '%UNION SELECT%' OR 
      request_path LIKE '%/etc/passwd%' OR
      request_path LIKE '%;cat%' OR
      request_path LIKE '%<script>%'
    )
  `).all(windowStart) as any[];

  for (const attack of webAttacks) {
    createAlert(io, {
      rule_triggered: "Web Attack Detected",
      severity: "Critical",
      source_ip: attack.source_ip,
      description: `Suspicious payload detected in request path: ${attack.request_path}`,
      related_logs: attack.id.toString()
    });
  }
}

function createAlert(io: Server, alert: any) {
  // Check if alert already exists for this IP and Rule in the last 5 mins to avoid spam
  const existing = db.prepare(`
    SELECT id FROM alerts 
    WHERE source_ip = ? AND rule_triggered = ? AND timestamp > ?
  `).get(alert.source_ip, alert.rule_triggered, new Date(Date.now() - 300000).toISOString());

  if (existing) return;

  const info = db.prepare(`
    INSERT INTO alerts (rule_triggered, severity, source_ip, description, related_logs)
    VALUES (?, ?, ?, ?, ?)
  `).run(alert.rule_triggered, alert.severity, alert.source_ip, alert.description, alert.related_logs);

  const newAlert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(info.lastInsertRowid);
  
  // Update IP Intelligence
  db.prepare(`
    INSERT INTO ip_intelligence (ip, attack_count, last_seen)
    VALUES (?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(ip) DO UPDATE SET 
      attack_count = attack_count + 1,
      last_seen = CURRENT_TIMESTAMP
  `).run(alert.source_ip);

  io.emit("new_alert", newAlert);
}
