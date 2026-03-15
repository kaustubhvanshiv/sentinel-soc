# Sentinel SOC — Release History

This document tracks major releases and feature milestones.

---

## v0.2.0 — SOC Prototype Release

Date: 2026-03-15

### Added

* SOC dashboard with alerts, logs, and IP intelligence
* Rule-based detection engine
* SSH brute force detection
* Path scanning detection
* Web attack detection
* Alert investigation interface
* Role-based access control
* Admin panel for user management
* Attack simulator for generating synthetic attack traffic
* Manual log ingestion interface
* Simulation reset system

### Improved

* Detection engine SQL timestamp compatibility fix
* Alert deduplication system
* Admin seed account repair logic

### Known Limitations

* Threat intelligence panel uses placeholder data
* GeoIP lookup not implemented
* Log export not implemented
* Pagination not implemented

---

## v0.1.0 — Initial SOC Engine

Initial internal prototype.

### Added

* SQLite database schema
* Log storage
* Detection engine framework
* Basic API routes
* Initial React dashboard

---

Future planned releases:

v0.3.0 — File log ingestion
v0.4.0 — Real system log monitoring
v0.5.0 — Threat intelligence integrations
v1.0.0 — Production-ready Sentinel SOC
