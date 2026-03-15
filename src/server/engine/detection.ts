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

// ─── Thresholds (lowered for faster testing) ───────────────────────────────
const SSH_BRUTE_THRESHOLD = 2;   // was 5
const PATH_SCAN_THRESHOLD  = 3;  // was 10
const DETECTION_WINDOW_MIN = 2;  // 2-minute rolling window
const DEDUP_WINDOW_MIN     = 5;  // suppress duplicate alerts for 5 mins

export function startDetectionEngine(io: Server) {
  console.log("Detection Engine started...");

  setInterval(() => {
    runRules(io);
  }, 5000);
}

async function runRules(io: Server) {
  console.log("[Detection] Running rules...");

  // ── Rule 1: SSH Brute Force ───────────────────────────────────────────────
  // FIX: Use SQLite's datetime() instead of JS ISO string to avoid format mismatch.
  // SQLite stores timestamps as 'YYYY-MM-DD HH:MM:SS' (space separator).
  // JS toISOString() produces 'YYYY-MM-DDTHH:MM:SS.mmmZ' (T + Z).
  // String comparison in SQLite would always fail with the ISO format.
  const bruteForceResults = db.prepare(`
    SELECT source_ip, COUNT(*) as failed_count, GROUP_CONCAT(id) as log_ids
    FROM logs
    WHERE event_type = 'auth_failure'
      AND service = 'ssh'
      AND timestamp > datetime('now', '-${DETECTION_WINDOW_MIN} minutes')
    GROUP BY source_ip
    HAVING failed_count >= ${SSH_BRUTE_THRESHOLD}
  `).all() as any[];

  console.log(`[Detection] Rule 1 (SSH Brute Force): ${bruteForceResults.length} match(es)`);

  for (const result of bruteForceResults) {
    console.log(`  → Brute force from ${result.source_ip}: ${result.failed_count} failures`);
    createAlert(io, {
      rule_triggered: "SSH Brute Force",
      severity: "High",
      source_ip: result.source_ip,
      description: `Detected ${result.failed_count} failed SSH login attempts in ${DETECTION_WINDOW_MIN} minutes.`,
      related_logs: result.log_ids
    });
  }

  // ── Rule 2: Port/Path Scanning ───────────────────────────────────────────
  const suspiciousIpResults = db.prepare(`
    SELECT source_ip, COUNT(DISTINCT request_path) as path_count, GROUP_CONCAT(id) as log_ids
    FROM logs
    WHERE timestamp > datetime('now', '-${DETECTION_WINDOW_MIN} minutes')
      AND request_path IS NOT NULL
    GROUP BY source_ip
    HAVING path_count > ${PATH_SCAN_THRESHOLD}
  `).all() as any[];

  console.log(`[Detection] Rule 2 (Path Scanning): ${suspiciousIpResults.length} match(es)`);

  for (const result of suspiciousIpResults) {
    console.log(`  → Scanning from ${result.source_ip}: ${result.path_count} unique paths`);
    createAlert(io, {
      rule_triggered: "Suspicious IP Activity",
      severity: "Medium",
      source_ip: result.source_ip,
      description: `IP accessed ${result.path_count} unique endpoints in a short period. Potential scanning.`,
      related_logs: result.log_ids
    });
  }

  // ── Rule 3: Web Attack Indicators ───────────────────────────────────────
  const webAttacks = db.prepare(`
    SELECT id, source_ip, raw_log, request_path
    FROM logs
    WHERE timestamp > datetime('now', '-${DETECTION_WINDOW_MIN} minutes')
      AND (
        request_path LIKE '%OR 1=1%'      OR
        request_path LIKE '%UNION SELECT%' OR
        request_path LIKE '%/etc/passwd%'  OR
        request_path LIKE '%;cat%'         OR
        request_path LIKE '%<script>%'
      )
  `).all() as any[];

  console.log(`[Detection] Rule 3 (Web Attacks): ${webAttacks.length} match(es)`);

  for (const attack of webAttacks) {
    console.log(`  → Web attack from ${attack.source_ip}: ${attack.request_path}`);
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
  // Deduplication: skip if same IP + rule had an alert in the last DEDUP_WINDOW_MIN minutes.
  // Also use SQLite datetime() here to avoid the same timestamp format bug.
  const existing = db.prepare(`
    SELECT id FROM alerts
    WHERE source_ip = ?
      AND rule_triggered = ?
      AND timestamp > datetime('now', '-${DEDUP_WINDOW_MIN} minutes')
  `).get(alert.source_ip, alert.rule_triggered);

  if (existing) {
    console.log(`[Detection] Skipping duplicate alert: ${alert.rule_triggered} for ${alert.source_ip}`);
    return;
  }

  const info = db.prepare(`
    INSERT INTO alerts (rule_triggered, severity, source_ip, description, related_logs)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    alert.rule_triggered,
    alert.severity,
    alert.source_ip,
    alert.description,
    alert.related_logs
  );

  console.log(`[Detection] ✅ ALERT CREATED — ID: ${info.lastInsertRowid} | Rule: ${alert.rule_triggered} | IP: ${alert.source_ip} | Severity: ${alert.severity}`);

  const newAlert = db.prepare("SELECT * FROM alerts WHERE id = ?").get(info.lastInsertRowid);

  // Update IP Intelligence
  db.prepare(`
    INSERT INTO ip_intelligence (ip, attack_count, last_seen)
    VALUES (?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(ip) DO UPDATE SET
      attack_count = attack_count + 1,
      last_seen = CURRENT_TIMESTAMP
  `).run(alert.source_ip);

  console.log(`[Detection] 🔍 IP Intelligence updated for ${alert.source_ip}`);

  io.emit("new_alert", newAlert);
}
