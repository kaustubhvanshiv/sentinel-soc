import { Express } from "express";
import { Server } from "socket.io";
import { db } from "./db";

export function setupRoutes(app: Express, io: Server) {
  // Stats for Dashboard
  app.get("/api/stats", (req, res) => {
    const totalLogs = db.prepare("SELECT COUNT(*) as count FROM logs").get() as any;
    const activeAlerts = db.prepare("SELECT COUNT(*) as count FROM alerts WHERE status != 'Resolved'").get() as any;
    const severityDist = db.prepare("SELECT severity, COUNT(*) as count FROM alerts GROUP BY severity").all();
    const topIps = db.prepare("SELECT ip, attack_count FROM ip_intelligence ORDER BY attack_count DESC LIMIT 5").all();
    
    // Timeline (last 24 hours grouped by hour)
    const timeline = db.prepare(`
      SELECT strftime('%H:00', timestamp) as hour, COUNT(*) as count 
      FROM alerts 
      WHERE timestamp > datetime('now', '-24 hours')
      GROUP BY hour
      ORDER BY hour ASC
    `).all();

    res.json({
      totalLogs: totalLogs.count,
      activeAlerts: activeAlerts.count,
      severityDist,
      topIps,
      timeline
    });
  });

  // Alerts
  app.get("/api/alerts", (req, res) => {
    const alerts = db.prepare("SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 50").all();
    res.json(alerts);
  });

  app.get("/api/alerts/:id", (req, res) => {
    const alert = db.prepare("SELECT * FROM alerts WHERE id = ?").get(req.params.id) as any;
    if (alert && alert.related_logs) {
      const logIds = alert.related_logs.split(',');
      const logs = db.prepare(`SELECT * FROM logs WHERE id IN (${logIds.map(() => '?').join(',')})`).all(...logIds);
      res.json({ ...alert, logs });
    } else {
      res.json(alert);
    }
  });

  app.patch("/api/alerts/:id", (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE alerts SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  // Logs
  app.get("/api/logs", (req, res) => {
    const { ip, service, status, limit = 100 } = req.query;
    let query = "SELECT * FROM logs WHERE 1=1";
    const params: any[] = [];

    if (ip) {
      query += " AND source_ip = ?";
      params.push(ip);
    }
    if (service) {
      query += " AND service = ?";
      params.push(service);
    }
    if (status) {
      query += " AND status = ?";
      params.push(status);
    }

    query += " ORDER BY timestamp DESC LIMIT ?";
    params.push(Number(limit));

    const logs = db.prepare(query).all(...params);
    res.json(logs);
  });

  // IP Intelligence
  app.get("/api/intelligence", (req, res) => {
    const data = db.prepare("SELECT * FROM ip_intelligence ORDER BY attack_count DESC").all();
    res.json(data);
  });

  // Manual Log Ingestion
  app.post("/api/logs/ingest", (req, res) => {
    const { source_ip, service, event_type, status, raw_log, request_path } = req.body;
    db.prepare(`
      INSERT INTO logs (source_ip, service, event_type, status, raw_log, request_path)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(source_ip, service, event_type, status, raw_log, request_path);
    res.json({ success: true });
  });
}
