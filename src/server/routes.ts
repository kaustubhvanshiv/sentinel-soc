import { Express, Request, Response, NextFunction } from "express";
import { Server } from "socket.io";
import { db } from "./db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { startSimulator, stopSimulator, getSimulatorStatus } from "./engine/simulator";

const JWT_SECRET = process.env.JWT_SECRET || "sentinel-soc-secret-change-in-prod";

function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized — token required" });
  }
  try {
    req.user = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized — invalid token" });
  }
}

function requireAdmin(req: any, res: any, next: any) {
  requireAuth(req, res, () => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden — admin access only" });
    }
    next();
  });
}

export function setupRoutes(app: Express, io: Server) {

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      if (!user) return res.status(401).json({ error: "Invalid credentials" });
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/users", requireAdmin, (req, res) => {
    const users = db
      .prepare("SELECT id, email, role, approved, created_at FROM users ORDER BY created_at DESC")
      .all();
    res.json(users);
  });

  app.post("/api/admin/users/create", requireAdmin, async (req: any, res) => {
    const { email, password, role = "analyst" } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
    if (!["admin", "analyst"].includes(role)) return res.status(400).json({ error: "Role must be 'admin' or 'analyst'" });
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) return res.status(400).json({ error: "User already exists" });
    const hash = await bcrypt.hash(password, 10);
    const info = db
      .prepare("INSERT INTO users (email, password, role, approved) VALUES (?, ?, ?, 1)")
      .run(email, hash, role);
    console.log(`[Admin] User created: ${email} (${role}) by ${req.user.email}`);
    res.json({ success: true, id: info.lastInsertRowid, email, role });
  });

  app.delete("/api/admin/users/:id", requireAdmin, (req: any, res) => {
    const target = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id) as any;
    if (!target) return res.status(404).json({ error: "User not found" });
    if (target.email === "admin@sentinel.soc") return res.status(403).json({ error: "Cannot delete the primary admin account" });
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    console.log(`[Admin] User deleted: ${target.email} by ${req.user.email}`);
    res.json({ success: true });
  });

  app.patch("/api/admin/users/:id/role", requireAdmin, (req: any, res) => {
    const { role } = req.body;
    if (!["admin", "analyst"].includes(role)) return res.status(400).json({ error: "Role must be 'admin' or 'analyst'" });
    const target = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id) as any;
    if (!target) return res.status(404).json({ error: "User not found" });
    db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, req.params.id);
    console.log(`[Admin] Role changed: ${target.email} → ${role} by ${req.user.email}`);
    res.json({ success: true });
  });

  app.patch("/api/admin/users/:id/reset-password", requireAdmin, async (req: any, res) => {
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
    const target = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id) as any;
    if (!target) return res.status(404).json({ error: "User not found" });
    const hash = await bcrypt.hash(password, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hash, req.params.id);
    console.log(`[Admin] Password reset: ${target.email} by ${req.user.email}`);
    res.json({ success: true });
  });

  app.get("/api/admin/simulator/status", requireAdmin, (req, res) => {
    res.json(getSimulatorStatus());
  });

  app.post("/api/admin/simulator/start", requireAdmin, (req, res) => {
    startSimulator();
    res.json({ success: true, status: getSimulatorStatus() });
  });

  app.post("/api/admin/simulator/stop", requireAdmin, (req, res) => {
    stopSimulator();
    res.json({ success: true, status: getSimulatorStatus() });
  });

  app.delete("/api/admin/simulator/clear", requireAdmin, (req: any, res) => {
    const simIps = ["192.168.1.50", "45.33.22.11", "10.0.0.5", "88.12.34.56", "172.16.0.22"];
    const placeholders = simIps.map(() => "?").join(",");
    const clearSimInfo = db.transaction(() => {
      const deletedLogs = db.prepare(`DELETE FROM logs WHERE source_ip IN (${placeholders})`).run(...simIps);
      const deletedAlerts = db.prepare(`DELETE FROM alerts WHERE source_ip IN (${placeholders})`).run(...simIps);
      const clearedIPs = db.prepare(`DELETE FROM ip_intelligence WHERE ip IN (${placeholders})`).run(...simIps);
      return { deletedLogs: deletedLogs.changes, deletedAlerts: deletedAlerts.changes, clearedIPs: clearedIPs.changes };
    })();
    console.log(`[Admin] Simulator data cleared by ${(req as any).user.email}:`, clearSimInfo);
    res.json({ success: true, ...clearSimInfo });
  });

  app.post("/api/logs/ingest", requireAdmin, (req: any, res) => {
    const { source_ip, service, event_type, status, request_path, user_agent, raw_log } = req.body;
    if (!source_ip || !service || !event_type || !status || !raw_log) {
      return res.status(400).json({ error: "Missing required log fields" });
    }
    try {
      db.prepare(`
        INSERT INTO logs (source_ip, service, event_type, status, request_path, user_agent, raw_log)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(source_ip, service, event_type, status, request_path || null, user_agent || null, raw_log);
      console.log(`[Admin] Manual log ingested by ${(req as any).user.email}: ${source_ip} - ${event_type}`);
      res.json({ success: true, message: "Log ingested successfully" });
    } catch (e: any) {
      console.error("[Logs] Ingestion error:", e.message);
      res.status(500).json({ error: "Failed to ingest log" });
    }
  });

  // ── SOC Data Routes (now protected with requireAuth) ──────────────────────

  app.get("/api/stats", requireAuth, (req, res) => {
    const totalLogs    = db.prepare("SELECT COUNT(*) as count FROM logs").get() as any;
    const activeAlerts = db.prepare("SELECT COUNT(*) as count FROM alerts WHERE status != 'Resolved'").get() as any;
    const severityDist = db.prepare("SELECT severity, COUNT(*) as count FROM alerts GROUP BY severity").all();
    const topIps       = db.prepare("SELECT ip, attack_count FROM ip_intelligence ORDER BY attack_count DESC LIMIT 5").all();
    const timeline     = db.prepare(`
      SELECT strftime('%H:00', timestamp) as hour, COUNT(*) as count
      FROM alerts
      WHERE timestamp > datetime('now', '-24 hours')
      GROUP BY hour ORDER BY hour ASC
    `).all();
    res.json({ totalLogs: totalLogs.count, activeAlerts: activeAlerts.count, severityDist, topIps, timeline });
  });

  app.get("/api/alerts", requireAuth, (req, res) => {
    const { search } = req.query;
    let query = "SELECT * FROM alerts";
    const params: any[] = [];
    if (search) {
      query += " WHERE source_ip LIKE ? OR rule_triggered LIKE ?";
      params.push(`%${search}%`, `%${search}%`);
    }
    query += " ORDER BY timestamp DESC LIMIT 50";
    res.json(db.prepare(query).all(...params));
  });

  app.get("/api/alerts/:id", requireAuth, (req, res) => {
    const alert = db.prepare("SELECT * FROM alerts WHERE id = ?").get(req.params.id) as any;
    if (alert?.related_logs) {
      const logIds = alert.related_logs.split(",");
      const logs = db.prepare(`SELECT * FROM logs WHERE id IN (${logIds.map(() => "?").join(",")})`).all(...logIds);
      return res.json({ ...alert, logs });
    }
    res.json(alert);
  });

  app.patch("/api/alerts/:id", requireAuth, (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE alerts SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/logs", requireAuth, (req, res) => {
    const { ip, service, status, limit = 100 } = req.query;
    let query = "SELECT * FROM logs WHERE 1=1";
    const params: any[] = [];
    if (ip) { query += " AND source_ip = ?"; params.push(ip); }
    // FIX: skip filter when "All" or "All Services" is selected
    if (service && service !== 'All' && service !== 'All Services') {
      query += " AND service = ?";
      params.push((service as string).toLowerCase());
    }
    if (status) { query += " AND status = ?"; params.push(status); }
    query += " ORDER BY timestamp DESC LIMIT ?";
    params.push(Number(limit));
    res.json(db.prepare(query).all(...params));
  });

  app.get("/api/intelligence", requireAuth, (req, res) => {
    const { search } = req.query;
    let query = "SELECT * FROM ip_intelligence";
    const params: any[] = [];
    if (search) {
      query += " WHERE ip LIKE ?";
      params.push(`%${search}%`);
    }
    query += " ORDER BY attack_count DESC";
    res.json(db.prepare(query).all(...params));
  });
}