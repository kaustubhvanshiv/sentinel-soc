# Sentinel SOC — Implementation Status

> Last updated: 2026-03-15  
> Stack: React 19 + Vite + Node.js/Express + SQLite (`better-sqlite3`) + Socket.IO + TypeScript

---

## ✅ FULLY IMPLEMENTED (Working, Real Data)

### 🗄️ Backend — Database (`src/server/db.ts`)
- SQLite database auto-created as `soc_system.db` on first run
- 4 tables: `users`, `logs`, `alerts`, `ip_intelligence`
- Auto-migration: adds `approved` column to `users` if it doesn't exist on restart
- Admin user auto-seeded on first run (see **Errors** section for a bug here)

### 🔌 Backend — REST API (`src/server/routes.ts`)
| Endpoint | Method | Status |
|---|---|---|
| `/api/auth/register` | POST | ✅ Works — creates user, hashes password with bcrypt, requires admin approval |
| `/api/auth/login` | POST | ✅ Works — validates password, checks approval status, returns JWT |
| `/api/admin/users` | GET | ✅ Works — admin-only, lists all users |
| `/api/admin/users/:id/approve` | POST | ✅ Works — sets `approved = 1` |
| `/api/admin/users/:id/reject` | POST | ✅ Works — deletes user |
| `/api/stats` | GET | ✅ Works — real counts from DB (logs, alerts, severity dist, top IPs, 24h timeline) |
| `/api/alerts` | GET | ✅ Works — last 50 alerts, real DB |
| `/api/alerts/:id` | GET | ✅ Works — single alert + related log records joined |
| `/api/alerts/:id` | PATCH | ✅ Works — update status (Open / Investigating / Resolved) |
| `/api/logs` | GET | ✅ Works — filterable by IP, service, status; limit param |
| `/api/intelligence` | GET | ✅ Works — IP table sorted by attack count |
| `/api/logs/ingest` | POST | ✅ Works — manual log ingestion endpoint |

### 🚨 Detection Engine (`src/server/engine/detection.ts`)
- Runs every **5 seconds** on a `setInterval`, scanning the DB
- **Rule 1 — SSH Brute Force**: ≥5 failed SSH `auth_failure` events from one IP within 2 minutes → High alert
- **Rule 2 — Port Scanning**: Single IP hits >10 unique request paths within 2 minutes → Medium alert
- **Rule 3 — Web Attack**: Request paths containing SQLi (`OR 1=1`, `UNION SELECT`), command injection (`/etc/passwd`, `;cat`), or XSS (`<script>`) → Critical alert
- **Deduplication**: Skips creating a duplicate alert for the same IP + rule if one was created in the last 5 minutes
- Auto-updates `ip_intelligence` table on every new alert (upsert)
- Emits `new_alert` Socket.IO event to all connected clients in real time

### 🤖 Log Simulator (`src/server/engine/simulator.ts`)
- Fires every **2 seconds**, inserts a row into `logs`
- 3 log types with probability weights: 60% normal HTTP, 20% SSH brute force, 20% web attack
- Correctly seeds data that triggers the detection engine rules

### 🔐 Authentication Flow (Frontend)
- `Login.tsx` — form with email/password, calls `/api/auth/login`, stores JWT + user in `localStorage`
- `Register.tsx` — form with email/password/confirm, client-side validation (password match, length ≥ 6)
- `App.tsx` — reads token from `localStorage` on mount to restore session; `handleLogout` clears storage
- Role-based UI: Admin-only "Admin Panel" nav item shown conditionally

### 👥 Admin Panel (`src/pages/AdminDashboard.tsx`)
- Lists pending users (approved=0) and active users (approved=1) from real API
- Approve / Reject buttons call real API endpoints with Bearer token
- Revoke Access button for non-admin active users (also calls reject/delete)

### 📋 Alerts Page (`src/pages/Alerts.tsx`)
- Fetches real alerts from `/api/alerts`, auto-refreshes every 5 seconds
- Severity filter buttons (All / Critical / High / Medium) — **client-side filtering, works**
- Click any row → navigates to AlertDetails view

### 🔎 Alert Details (`src/pages/AlertDetails.tsx`)
- Fetches real alert data including related log records (joined on backend)
- "Investigate" and "Mark Resolved" buttons — call real `PATCH /api/alerts/:id`, update DB
- Displays incident ID, severity, rule name, description, timestamp, status from real data
- Related logs table shows real evidence logs linked to the alert

### 📊 Dashboard (`src/pages/Dashboard.tsx`)
- All 4 metric cards pull real data: Total Logs, Active Alerts (from `/api/stats`)
- Attack Timeline chart (24h grouped by hour) — real DB data via `/api/stats`
- Severity Distribution pie chart — real DB data
- Top Threat Actors widget — real IPs and attack counts from `ip_intelligence`
- Auto-refreshes every 5 seconds

### 📜 Log Explorer (`src/pages/Logs.tsx`)
- Fetches real logs from `/api/logs`
- Service filter dropdown (All / SSH / HTTP / Auth) — triggers real API re-fetch
- Client-side text search filters by IP, raw_log, username — works
- Shows log count in footer

### 🌐 IP Intelligence (`src/pages/Intelligence.tsx`)
- Fetches real IPs from `/api/intelligence`
- Shows IP, country, attack count, first/last seen timestamps — all real DB fields
- Reputation badge computed from `attack_count` (>50 = MALICIOUS, >10 = SUSPICIOUS, else CLEAN)

### ⚡ Real-Time WebSocket
- `App.tsx` connects Socket.IO on load
- Listens for `new_alert` events, increments a badge counter on the Alerts nav item

---

## ❌ FAKED / HARDCODED / MOCKED

### Dashboard — Static Metrics
| Widget | What's Faked |
|---|---|
| "Avg. Response Time" stat card | Hardcoded `"4.2m"` with a fake `"-15%"` trend — no real measurement |
| "System Integrity" stat card | Hardcoded `"99.9%"` with `"Stable"` — not computed |
| "Total Logs" trend | Hardcoded `"+12.5%"` — not a real comparison to previous period |
| "Active Alerts" trend | Hardcoded `"+2"` — not computed |
| System Health panel | All 4 rows (Log Ingestion Engine, Detection Rule Processor, Database, API Gateway) are **completely hardcoded** with static labels, statuses, and load percentages (`12%`, `24%`, `8%`, `4%`) |

### AlertDetails — Hardcoded Threat Intelligence Panel
The entire right-column "Threat Intelligence" sidebar in `AlertDetails.tsx` is fake:
- **Risk Score**: Always `88/100` — same for every alert regardless of IP
- **First Seen**: Always `"2 days ago"` — hardcoded string, not from DB
- **Total Attacks**: Always `"142 events"` — hardcoded, not from `ip_intelligence`
- **Known Proxies**: Always `"None detected"`
- **ISP**: Always `"DigitalOcean, LLC"`
- **Location**: Always `"United States / Ashburn, VA"` — same for all IPs
- **"View Full IP Profile" button**: Does nothing (no `onClick`)
- **Recommended Actions**: Hardcoded static list, same for every alert type

### IP Intelligence — Placeholder Threat Map
- The "Interactive Threat Map Visualization" is a fake placeholder with 3 static glowing dots
- No real geolocation or map library integrated
- `country` field in DB always stores `'Unknown'` — simulator never populates it

### IP Intelligence — Non-functional Whois Button
- "Whois" button for each IP in the Intelligence table has no `onClick` handler

### Intelligence Page — Non-functional Search
- The search input in the IP Intelligence page has no `onChange` handler — typing does nothing

### Alerts Page — Non-functional Search
- The search bar (Search by IP or Rule) has no `onChange` or `value` binding — it's purely visual/decorative

### Simulator — Fixed IPs Only
- The log simulator uses only **5 hardcoded IPs**: `192.168.1.50`, `45.33.22.11`, `10.0.0.5`, `88.12.34.56`, `172.16.0.22`
- Brute force always from `45.33.22.11`; web attacks always from `88.12.34.56`
- No realistic diversity of sources

---

## 🔧 HALF-IMPLEMENTED

### Log Explorer — Pagination
- Pagination UI exists (Previous/Next buttons, "Page 1" text) but both buttons are `disabled` permanently
- Only ever shows the last 100 logs with no way to go back further

### Log Explorer — Export Button
- "Export" button exists in the UI with a `Download` icon but has no `onClick` and does nothing

### Settings Button
- A `Settings` icon button exists in the top-right header of the main layout but has no `onClick` / destination

### Sidebar Collapse
- Sidebar collapse button (Menu/X icon) works and toggles the sidebar width
- HOWEVER: when collapsed, nav labels hide but nav items lose their text — works visually but some icons lose context

### JWT Authentication on Data Routes
- `/api/stats`, `/api/alerts`, `/api/logs`, `/api/intelligence` are all **unprotected** — no auth middleware
- Any unauthenticated request can read all SOC data
- Only admin routes (`/api/admin/*`) are protected by the `authenticateAdmin` middleware

### `GEMINI_API_KEY` / AI Integration
- The `.env.example` mentions `GEMINI_API_KEY` and `APP_URL`
- `@google/genai` is listed as a dependency in `package.json`
- **No AI features are implemented anywhere in the code** — the package is installed but unused

---

## 🐛 BUGS & ERRORS

### 🔴 CRITICAL — Admin Seed has Invalid/Broken Password Hash
In `db.ts` line 79, the admin user is seeded with:
```
'$2a$10$X7vH.Mv.Xv.Xv.Xv.Xv.Xv.Xv.Xv.Xv.Xv.Xv.Xv.Xv.Xv.Xv.Xv.'
```
This is a **placeholder string, not a real bcrypt hash**. The `bcrypt.compare()` call in the login route will always fail for `admin@sentinel.soc`. **The admin account cannot log in.**

> **Fix needed**: Run `bcrypt.hash('admin', 10)` and replace the placeholder, or generate a real hash and hard-code it.

### 🔴 CRITICAL — Register Page Crashes After Successful Registration
In `Register.tsx` line 47:
```ts
onRegister(data.token, data.user);
```
But the `/api/auth/register` endpoint returns `{ success: true, message: "...Pending admin approval." }` — **no `token` or `user` field**. This means `data.token` and `data.user` are both `undefined`. Calling `onRegister(undefined, undefined)` then calls `handleLogin` which stores `undefined` in localStorage and attempts to `JSON.parse(undefined)` — causing a runtime crash.

> **Fix needed**: After successful registration, show a success message and redirect to login instead of calling `onLogin`.

### 🟡 MEDIUM — No Auth on Data API Routes
All SOC data endpoints (`/api/stats`, `/api/logs`, `/api/alerts`, `/api/intelligence`) are open to the public — no token required. A user who never logs in can `curl http://localhost:3000/api/logs` and see everything.

### 🟡 MEDIUM — Detection Engine Generates Duplicate Alerts Over Time
The deduplication window is 5 minutes, but the simulator generates brute-force logs from the **same fixed IP** every 2 seconds. This means a new SSH Brute Force alert is created every 5 minutes for `45.33.22.11` indefinitely, flooding the database over long runs.

### 🟡 MEDIUM — `ip_intelligence` `country` Column Always `'Unknown'`
The `country` column exists in the DB schema but the simulator never populates it, and there's no GeoIP lookup. All IPs will always show `"Unknown"` country.

### 🟡 MEDIUM — `/api/logs` Filter Bug: "All Services" Option
In `Logs.tsx`, the `<select>` option is `<option>All Services</option>` (value = `"All Services"`) but the filter check is `serviceFilter === 'All'`. They will never match — the "All Services" option will always pass `"All Services"` as a service filter to the API instead of `undefined`.

### 🟠 LOW — JWT Secret Hardcoded
`routes.ts` line 7: `const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-in-production"` — the fallback secret is committed to source and will be used in any deployment that doesn't set the env var.

### 🟠 LOW — Socket.IO Initialized Outside Component in App.tsx
`const socket = io();` at module scope (line 29 in `App.tsx`) creates the socket connection immediately when the module is loaded, even before authentication. The socket is never disconnected on logout.

---

## 🔁 REDUNDANCIES

- **`axios` and `fetch` used in the same project**: Data pages (`Dashboard`, `Alerts`, `Logs`, `Intelligence`, `AlertDetails`) use `axios`. Auth pages (`Login`, `Register`, `AdminDashboard`) use native `fetch`. Should be standardized to one.
- **Two separate HTTP clients for the same API**: Mixing `axios` and `fetch` with no abstraction layer means error handling, base URL config, and headers are duplicated.
- **`vite` listed twice in `package.json`**: `vite` appears in both `dependencies` and `devDependencies`.
- **Auto-refresh polling and WebSocket coexist**: `Dashboard.tsx` and `Alerts.tsx` both poll `/api/stats` and `/api/alerts` every 5 seconds via `setInterval`, while the app also has a Socket.IO `new_alert` listener for real-time push. The polling makes the WS partially redundant for refresh purposes.
- **`SEVERITY_COLORS` defined separately in `Alerts.tsx` and `Dashboard.tsx`**: Same severity→color mapping is duplicated across files with no shared constants file.

---

## 📋 REMAINING / TO-DO

| Feature | Notes |
|---|---|
| Fix admin login | Replace broken seed hash with a real bcrypt hash |
| Fix registration flow | Show success message, redirect to login — don't call `onRegister` |
| Protect data API routes | Add auth middleware (or at least an analyst-level token check) to `/api/stats`, `/api/alerts`, `/api/logs`, `/api/intelligence` |
| Real Threat Intelligence panel | Replace hardcoded sidebar in AlertDetails with real data from `ip_intelligence` table |
| Real GeoIP / country lookup | Populate `country` field using a GeoIP library (e.g., `geoip-lite`) |
| Whois button | Link to an external Whois service or integrate a lookup API |
| Threat Map | Integrate a real world map (e.g., Leaflet or D3) with actual IP coordinates |
| Intelligence search | Wire up the search input in `Intelligence.tsx` |
| Alerts search | Wire up the search input in `Alerts.tsx` (server-side preferred) |
| Log pagination | Implement real cursor/offset-based pagination for the Log Explorer |
| Log Export | Implement CSV/JSON export for logs |
| Real system health metrics | Replace hardcoded load percentages with actual `process.cpuUsage()`, DB size, etc. |
| Real dashboard trends | Compute period-over-period % changes for stat card trends |
| AI Analysis (Gemini) | `@google/genai` is installed but zero AI features exist — potential for AI-assisted alert triage |
| Role management | Admin can only approve/reject; no way to promote an analyst to admin |
| Audit log | No record of who investigated/resolved an alert |
| Settings page | Settings icon in header is a dead button |
| Standardize HTTP client | Pick either `axios` or `fetch` and use consistently |
| Fix `package.json` duplicate | Remove `vite` from `dependencies` (keep in `devDependencies` only) |
| Fix "All Services" filter bug | Change select option value from `"All Services"` to `"All"` |
| JWT Secret management | Add `.env` validation to reject startup if `JWT_SECRET` is not set |
