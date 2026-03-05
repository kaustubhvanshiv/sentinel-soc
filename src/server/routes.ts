import { Express } from "express";
import { Server } from "socket.io";
import { db } from "./db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-in-production";

export function setupRoutes(app: Express, io: Server) {
  // Authentication Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const existingUser = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      // New users are unapproved (0) by default
      const info = db.prepare('INSERT INTO users (email, password, approved) VALUES (?, ?, 0)').run(email, hashedPassword);

      // Do NOT issue token, return success requiring approval
      res.json({ success: true, message: "Registration successful. Pending admin approval." });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (user.approved === 0) {
        return res.status(403).json({ error: "Account pending admin approval" });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin Middleware
  const authenticateAdmin = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      if (decoded.role !== 'admin') {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  };

  // Admin: Get all users (including pending)
  app.get("/api/admin/users", authenticateAdmin, (req, res) => {
    const users = db.prepare("SELECT id, email, role, approved, created_at FROM users ORDER BY created_at DESC").all();
    res.json(users);
  });

  // Admin: Approve user
  app.post("/api/admin/users/:id/approve", authenticateAdmin, (req, res) => {
    try {
      db.prepare("UPDATE users SET approved = 1 WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to approve user" });
    }
  });

  // Admin: Reject (Delete) user
  app.post("/api/admin/users/:id/reject", authenticateAdmin, (req, res) => {
    try {
      db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to reject user" });
    }
  });

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
