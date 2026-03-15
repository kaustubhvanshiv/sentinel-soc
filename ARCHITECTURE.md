# Sentinel SOC — System Architecture

Sentinel SOC is a lightweight Security Information and Event Management (SIEM) system designed to demonstrate real-world SOC monitoring workflows.

The system ingests logs, analyzes them using rule-based detection, generates alerts, and provides a dashboard for SOC analysts to investigate incidents.

---

# High Level Architecture

```
        Log Sources
            │
            ▼
     Log Ingestion Layer
            │
            ▼
      Detection Engine
            │
            ▼
        Alert Engine
            │
            ▼
        SQLite Database
      ┌────────┬────────┬─────────┐
      ▼        ▼        ▼
     Logs     Alerts   IP Intelligence
      │        │        │
      └────────┴────────┴─────────┐
                                   ▼
                            SOC Dashboard
                          (React Frontend)
```

---

# Components

## 1. Log Sources

Logs can originate from multiple sources:

* System logs
* Web server logs
* SSH authentication logs
* Simulated attack traffic (development mode)
* Manual log ingestion via Admin Panel

Future roadmap includes:

* File-based log ingestion
* Docker container logs
* External system log pipelines

---

## 2. Log Ingestion Layer

Logs enter the system through the backend API.

Main ingestion methods:

```
POST /api/logs
POST /api/admin/ingest
```

The ingestion layer:

* normalizes incoming logs
* extracts metadata (IP, service, status)
* stores the raw log
* triggers detection evaluation

Logs are stored in the `logs` table.

---

## 3. Detection Engine

The detection engine runs continuously every **5 seconds**.

It analyzes recent logs using rule-based correlation.

Current rules include:

### SSH Brute Force

Trigger condition:

```
≥ 2 failed SSH login attempts
within 2 minutes
from the same IP
```

### Path Scanning

Trigger condition:

```
Single IP accessing
more than 3 unique endpoints
within 2 minutes
```

### Web Attack Detection

Detects suspicious payloads including:

* SQL injection (`OR 1=1`, `UNION SELECT`)
* Command injection (`;cat`, `/etc/passwd`)
* Cross-site scripting (`<script>`)

If a rule is triggered:

```
Alert is created
IP intelligence updated
```

---

## 4. Alert Engine

When detection rules trigger:

1. An alert is created in the `alerts` table
2. The alert is linked to related logs
3. IP intelligence metrics are updated
4. WebSocket pushes the alert to the frontend

Alerts include:

* severity level
* source IP
* detection rule
* evidence logs
* investigation status

---

## 5. Database Layer

Sentinel SOC uses **SQLite** via `better-sqlite3`.

Tables include:

```
users
logs
alerts
ip_intelligence
```

### Logs Table

Stores raw events ingested by the system.

### Alerts Table

Stores detection rule triggers.

### IP Intelligence Table

Tracks malicious IP behavior including:

* total attacks
* first seen timestamp
* last seen timestamp
* risk score

---

## 6. SOC Dashboard (Frontend)

The frontend is built with:

```
React 19
TailwindCSS
Recharts
Framer Motion
```

Main interface modules:

### Dashboard

Shows SOC metrics including:

* total logs
* active alerts
* severity breakdown
* attack timeline
* top threat actors

### Alerts

Displays detection alerts.

Analysts can:

```
Investigate
Mark resolved
Review evidence logs
```

### Log Explorer

Allows analysts to:

```
Search logs
Filter by service
Analyze raw telemetry
```

### IP Intelligence

Tracks threat actors across incidents.

---

# Authentication and Access Control

Sentinel SOC uses **JWT-based authentication**.

Roles:

```
Admin
SOC Analyst
```

Admins can:

* create accounts
* reset passwords
* manage roles
* run log simulations

SOC analysts can:

* view logs
* investigate alerts
* analyze threat intelligence

---

# Real-Time Communication

The backend uses:

```
Socket.IO
```

for real-time updates.

When alerts are generated:

```
Detection Engine
      │
      ▼
Socket.IO Event
      │
      ▼
React Dashboard updates instantly
```

---

# Development Simulation Environment

For development and demonstrations, Sentinel SOC includes a **log simulator**.

The simulator generates:

* SSH brute force attempts
* Web attack payloads
* Normal HTTP traffic

This allows developers to:

```
test detection rules
verify alert workflows
demonstrate SOC investigations
```

The simulator can be controlled from the **Admin Panel**.

---

# Future Architecture Roadmap

Planned enhancements:

```
Real log ingestion pipelines
Docker container log monitoring
GeoIP enrichment
Threat intelligence feeds
Advanced correlation rules
Distributed log processing
```

---

# Summary

Sentinel SOC demonstrates the core architecture of a real SIEM platform:

```
Log Collection
      ↓
Detection Engine
      ↓
Alert Generation
      ↓
Threat Intelligence
      ↓
SOC Analyst Investigation
```

The platform is designed to illustrate how modern SOC environments monitor, detect, and respond to security threats.