# OrganConnect — AI-Powered Organ Allocation & Transplant Coordination System

> **Academic Prototype / Decision-Support Simulation**
> This is NOT a clinical system. It does not replace authorized medical organ allocation policy or decisions. All data used is synthetic/demo data. Final allocation decisions rest with the authorized transplant coordinator and applicable medical/allocation rules.

---

## Overview

A full-stack MVP demonstrating the complete organ donation and transplant coordination workflow with 3 strict role-based access control layers.

```
Admin → Hospitals → Donors/Receivers → Eligibility → Coordinator Matching → Priority → Sequential Offers → Accept/Reject → Allocation → Completion
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Tailwind CSS v4 |
| Backend | FastAPI (Python 3.10) |
| Database | SQLite (via SQLAlchemy ORM) |
| Auth | JWT + bcrypt (role-based) |
| State | TanStack React Query |

## Roles

| Role | Description |
|---|---|
| **ADMIN** | Manages hospitals, views system stats |
| **HOSPITAL** | Registers donors/receivers, uploads reports, manages allocation requests |
| **COORDINATOR** | Runs matching, generates priority lists, manages sequential offers, confirms allocations |

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
python seed_data.py          # Creates demo data
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

## Demo Login Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@organalloc.com | admin123 |
| Coordinator | coordinator@organalloc.com | coord123 |
| Hospital A (Donor) | hospitala@organalloc.com | hospital123 |
| Hospital B (Receiver 1) | hospitalb@organalloc.com | hospital123 |
| Hospital C (Receiver 2) | hospitalc@organalloc.com | hospital123 |

## End-to-End Demo Scenario

The seed data creates:
- **Donor D001** (Hospital A) — Blood Group O+ — Kidney K001 + Liver L001 — **ELIGIBLE**
- **Receiver R001** (Hospital B) — Blood Group O+ — Needs Kidney — HIGH urgency — 245 days waiting — **ELIGIBLE**
- **Receiver R002** (Hospital C) — Blood Group A+ — Needs Kidney — CRITICAL urgency — 180 days waiting — **ELIGIBLE**

**Coordinator Flow:**
1. Login as Coordinator → Dashboard
2. Go to Available Organs → Select Kidney K001 → Run Match
3. System applies ABO compatibility hard filters + generates priority list
4. R002 (CRITICAL, A+) scores highest → Priority #1
5. R001 (HIGH, O+) → Priority #2
6. Send offer to Priority #1 Hospital C
7. If Hospital C rejects → record reason → move to Hospital B
8. Hospital B accepts → Coordinator confirms → ALLOCATED
9. Coordinator marks COMPLETED

## Priority Scoring (Academic Model)

```
Score = Urgency (0-40) + Waiting Time (0-30) + Compatibility (0-30)

Urgency: CRITICAL=40, HIGH=30, MEDIUM=20, LOW=10
Waiting: (days/365) × 30
Compatibility: Exact blood match=30, Compatible=20
```

Clearly labeled as a configurable academic model.

## ABO Compatibility Matrix

| Donor ↓ | O+ | O- | A+ | A- | B+ | B- | AB+ | AB- |
|---|---|---|---|---|---|---|---|---|
| **O+** | ✓ | | ✓ | | ✓ | | ✓ | |
| **O-** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **A+** | | | ✓ | | | | ✓ | |
| **A-** | | | ✓ | ✓ | | | ✓ | ✓ |
| **B+** | | | | | ✓ | | ✓ | |
| **B-** | | | | | ✓ | ✓ | ✓ | ✓ |
| **AB+** | | | | | | | ✓ | |
| **AB-** | | | | | | | ✓ | ✓ |

## Database Structure

```
users          — Auth for all roles
hospitals      — Admin-managed hospital registry
patients       — Shared table for donors and receivers
donor_profiles — Donor-specific medical information
receiver_profiles — Receiver-specific data (required organ, urgency)
organs         — Per-organ records (multiple per donor)
medical_reports — Uploaded reports per patient
matches        — Priority-ranked compatibility matches per organ
allocation_offers — Sequential offer records with response status
allocations    — Final allocation records
allocation_history — Event log for every allocation action
notifications  — In-app notifications per user
```

## Allocation Status Flow

```
Organ:     AVAILABLE → OFFERED → ALLOCATED → COMPLETED
                             ↘ UNALLOCATED (all candidates rejected)

Offer:     PENDING → ACCEPTED | REJECTED | EXPIRED

Overall:   IN_PROGRESS → ALLOCATED → COMPLETED | UNALLOCATED
```

## Security

- JWT authentication (8-hour tokens)
- bcrypt password hashing
- Role-based access control (RBAC) on every endpoint
- Hospital-level data isolation (hospitals cannot see each other's private patient records)
- Allocation lock: only one active offer per organ at a time

---

> Built as an academic EDI (Entrepreneurship Development & Innovation) semester project.
