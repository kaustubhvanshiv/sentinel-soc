# Sentinel SOC — Implementation Status

> Last updated: 2026-03-15  
> Stack: React 19 + Vite + Node.js/Express + SQLite + Socket.IO + TypeScript

---

## ✅ FULLY IMPLEMENTED & WORKING

### Backend
| Component | Status | Notes |
|---|---|---|
| SQLite DB init (4 tables) | ✅ | `users`, `logs`, `alerts`, `ip_intelligence` |
| Admin seed | ✅ Fixed | `bcrypt.hashSync` at runtime — auto-repairs broken hash on restart |
| `POST /api/auth/login` | ✅ | bcrypt compare, JWT sign, no approval gate |
| `requireAuth` middleware | ✅ | JWT verify on any route |
| `requireAdmin` middleware | ✅ | JWT verify + role === 'admin' |
| `GET /api/admin/users` | ✅ | Admin only |
| `POST /api/admin/users/create` | ✅ | Admin creates analyst/admin accounts |
| `DELETE /api/admin/users/:id` | ✅ | Admin deletes user; primary admin protected |
| `PATCH /api/admin/users/:id/role` | ✅ | Change analyst ↔ admin |
| `PATCH /api/admin/users/:id/reset-password` | ✅ | bcrypt rehash |
| `GET /api/stats` | ✅ | Live counts, severity dist, top IPs, 24h timeline |
| `GET /api/alerts` | ✅ | Last 50 alerts |
| `GET /api/alerts/:id` | ✅ | Alert + related evidence logs joined |
| `PATCH /api/alerts/:id` | ✅ | Update status |
| `GET /api/logs` | ✅ | Filterable by IP, service, status |
| `GET /api/intelligence` | ✅ | IP table sorted by attack count |
| `POST /api/logs/ingest` | ✅ | Manual log ingestion |

### Detection Engine (`detection.ts`)
| Rule | Status | Threshold | Severity |
|---|---|---|---|
| SSH Brute Force | ✅ Working | 2 failures / 2 min (lowered for demo) | High |
| Path Scanning | ✅ Working | >3 unique paths / 2 min | Medium |
| Web Attack (SQLi, CMDi, XSS) | ✅ Working | Any match in 2 min | Critical |
| Deduplication | ✅ Working | 5-min suppression window per IP+rule |
| IP Intelligence update | ✅ Working | Upsert on every new alert |
| Socket.IO push | ✅ Working | `new_alert` event emitted to all clients |

> **Root cause that was fixed:** `toISOString()` produces `T`-separated ISO format; SQLite stores `YYYY-MM-DD HH:MM:SS` (space). String comparison always failed. Fixed by using `datetime('now', '-N minutes')` directly in SQL.

### Log Simulator (`simulator.ts`)
- Fires every 2 seconds: 50% normal HTTP, 30% SSH brute force (×2 per tick), 20% web attack
- Dedicated scanner interval every 4s, rotating 12 distinct paths
- Correctly triggers all 3 detection rules within ~10 seconds of startup

### Frontend — All Pages
| Page | Real Data | Auto-refresh |
|---|---|---|
| Dashboard | ✅ | Every 5s |
| Alerts page | ✅ | Every 5s |
| Alert Details | ✅ | On open |
| Log Explorer | ✅ | On filter change |
| IP Intelligence | ✅ | On open |
| Admin Panel | ✅ | On open |

### Auth & RBAC
- JWT stored in `localStorage`, restored on page reload (with `try/catch` guard against corrupt values)
- Admin sees "Admin Panel" in sidebar; analysts don't
- Register page **removed** — admin creates all accounts
- Login shows "Access is provisioned by your SOC administrator"

---

## ❌ FAKED / HARDCODED

| Location | What's Faked |
|---|---|
| Dashboard — "Avg. Response Time" | Hardcoded `"4.2m"` |
| Dashboard — "System Integrity" | Hardcoded `"99.9%"` |
| Dashboard — stat trends | `+12.5%`, `+2`, `-15%` all hardcoded |
| Dashboard — System Health panel | Load percentages and statuses are static strings |
| AlertDetails — Threat Intelligence sidebar | Risk score `88/100`, ISP `DigitalOcean`, location `Ashburn VA`, Total Attacks `142` — all hardcoded, same for every alert |
| AlertDetails — Recommended Actions | Same 4 bullet points for every alert type |
| IP Intelligence — country column | Always `"Unknown"` — no GeoIP lookup |
| IP Intelligence — Threat Map | Fake placeholder with 3 CSS dots |

---

## 🔧 HALF-IMPLEMENTED

| Feature | State |
|---|---|
| Log pagination | UI exists (Prev/Next buttons) but both are `disabled` — always shows last 100 |
| Log Export button | Button exists with icon, no `onClick` |
| Settings button | Icon in header, no destination |
| Intelligence search | Input rendered, no `onChange` handler |
| Alerts search bar | Input rendered, no `onChange` / value binding |
| Whois button | Button per IP row, no `onClick` |
| GeoIP / country | Schema has `country` column, simulator never populates it |
| AI (Gemini) | `@google/genai` installed, zero code uses it |
| Auth on data routes | `/api/stats`, `/api/logs`, `/api/alerts`, `/api/intelligence` are open — no token required |

---

## 🐛 KNOWN BUGS / ISSUES

| Severity | Issue |
|---|---|
| 🟡 Medium | `/api/logs` service filter bug: `<option>All Services</option>` sends value `"All Services"` but code checks `=== 'All'` — never matches, always filters |
| 🟡 Medium | Detection dedup is per-rule (not per attack-path), so a single IP triggering `Web Attack Detected` 3 different ways will only create 1 alert per 5 minutes total |
| 🟡 Medium | Socket initialized at module scope in `App.tsx` — never disconnected on logout |
| 🟠 Low | JWT secret falls back to hardcoded string if `JWT_SECRET` env not set |
| 🟠 Low | `vite` listed in both `dependencies` and `devDependencies` in `package.json` |
| 🟠 Low | `axios` (data pages) and `fetch` (auth pages + admin) used inconsistently |

---

## 📋 REMAINING WORK

| Priority | Feature |
|---|---|
| High | Wire up Alerts search bar (server-side filter by IP/rule) |
| High | Protect data API routes with `requireAuth` middleware |
| High | Fix "All Services" filter bug in Log Explorer |
| Medium | Real Threat Intelligence panel in AlertDetails (load from `ip_intelligence` table) |
| Medium | Implement log pagination (offset/cursor based) |
| Medium | Log CSV export |
| Medium | GeoIP country lookup on alert creation |
| Medium | Real system health metrics (`process.cpuUsage()`, DB file size) |
| Medium | Real trend % on stat cards (compare to previous period) |
| Low | Interactive threat map (Leaflet or D3 with real IP coordinates) |
| Low | Whois integration for IP lookup |
| Low | AI-assisted alert triage using `@google/genai` |
| Low | Audit log (who investigated/resolved which alert) |
| Low | Remove `vite` from `dependencies` in `package.json` |
| Low | Standardize HTTP client to `axios` everywhere |
