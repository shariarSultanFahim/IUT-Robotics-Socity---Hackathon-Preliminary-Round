# Office Device Monitor

> _"Lights, Fans, Discord: The Boss's Big Idea"_ — IUT Robotics Society Hackathon (Preliminary Round)


Real-time monitoring of office lights and fans with a live web dashboard, a
Discord bot, and one shared NestJS backend. All device data is **simulated** —
no physical hardware required — and the dashboard and Discord bot always reflect
the same shared backend state.

> **Device states, usage accumulation and active alerts are simulated and held
> in backend memory. They reset when the backend process restarts. PostgreSQL is
> used only for authentication and refresh sessions.**

The authoritative specification is [`PROJECT_BRIEF.md`](./PROJECT_BRIEF.md).

---

## Device-count assumption

The source problem statement is inconsistent (it mentions both 5 and 6 devices
per room). This project follows the **mathematically consistent** configuration:

- **3 rooms:** `drawing`, `work1`, `work2`
- **2 fans + 3 lights per room** → **15 devices total** (6 fans, 9 lights)
- Fan = **60 W** on, Light = **15 W** on, OFF = **0 W**
- Office hours **09:00–17:00**, timezone **Asia/Dhaka**

---

## Architecture

```
                         ┌──────────────── Next.js dashboard (dashboard/) ────────────────┐
 Browser  ◀────────────▶ │  App Router · TanStack Query · Axios · Socket.IO · Recharts     │
                         │  in-memory access token · HttpOnly refresh cookie · role-aware  │
                         └───────▲───────────────────────────────────▲────────────────────┘
                REST (Bearer)    │                     Socket.IO (token handshake)
                                 │                                    │
                         ┌───────┴────────────── NestJS backend (backend/) ────────────────┐
                         │  In-memory: Devices (Map) · Usage (kWh accumulator) · Alerts     │
                         │  Simulator · Realtime gateway · Discord bot                      │
                         │  Auth (JWT + rotating refresh) ──▶ Prisma ──▶ PostgreSQL         │
                         │                                   (User + RefreshSession ONLY)   │
                         └─────────────────────────────────────────────────────────────────┘
```

Simulated devices, usage and active alerts live in one shared in-memory
`DevicesService`/`UsageService`/`AlertsService`. PostgreSQL (via Prisma) stores
**only** `User` and `RefreshSession`. Monitoring state resets on backend restart.

## Repository layout

```
.
├── backend/     ← NestJS API + Prisma + Socket.IO + Discord bot + JWT auth
├── dashboard/   ← Next.js App Router dashboard (auth + live data)
├── docs/        ← system diagram + Wokwi schematic
└── PROJECT_BRIEF.md
```

- **Backend** — see **[`backend/README.md`](./backend/README.md)** for full REST,
  Socket.IO, Discord, auth, alert-rule and testing documentation.
- **Frontend** — see **[`dashboard/README.md`](./dashboard/README.md)** for the
  dashboard setup, auth flow and live-sync details.

---

## Quick start

**1. Backend**

```bash
cd backend
cp .env.example .env          # set DATABASE_URL + JWT secrets + SEED_* users
npm install
npm run prisma:generate
npm run prisma:migrate:deploy # applies auth migrations (drops old monitoring tables — see note)
npm run prisma:seed           # seeds ADMIN/VIEWER users (idempotent). Devices are in-memory.
npm run start:dev             # http://localhost:3001  (Swagger at /api/docs)
```

**2. Frontend**

```bash
cd dashboard
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run dev                   # http://localhost:3000
```

Sign in with the seeded credentials, then explore the live dashboard.

> **Migration note (destructive, one-time).** The `20260704000000_monitoring_to_memory`
> migration **drops** the obsolete monitoring tables (`Device`,
> `DeviceStateHistory`, `PowerSnapshot`, `Alert`) and their enums. It preserves
> `User`, `RefreshSession`, the `Role` enum and Prisma migration metadata. It
> never runs `migrate reset` and never touches auth data. On a shared/production
> database, review the SQL first and let the owner run
> **`npm run prisma:migrate:deploy`** deliberately.

---

## Authentication & roles

- **Backend-managed auth.** Passwords are bcrypt-hashed; a short-lived access
  JWT (default 15 min) is returned in the response body (kept in memory by the
  SPA), and a rotating refresh token (default 7 days) is stored **only as a hash**
  and delivered via an **HttpOnly cookie**. Refresh rotates and revokes the old
  session; logout revokes it.
- **Endpoints:** `POST /api/auth/login`, `POST /api/auth/refresh`,
  `POST /api/auth/logout`, `GET /api/auth/me`.
- **Public routes:** `/health`, `/api/docs`, `/api/docs-json`,
  `/api/auth/login`, `/api/auth/refresh`.
- **Roles:**

  | Capability | ADMIN | VIEWER |
  |---|:--:|:--:|
  | View devices / usage / alerts / history | ✅ | ✅ |
  | `PATCH /api/devices/:id/status` (manual control) | ✅ | ❌ (403) |

  Frontend role-hiding is UX only — the backend guards are the real boundary.
- **Socket.IO** requires the access token in the handshake
  (`socket.auth = { token }`); missing/invalid/expired tokens are rejected.

> **Demo credentials warning:** the `SEED_*` values in `.env` are for local demos
> only. **Never commit real passwords or secrets**, and use strong unique
> credentials (and `AUTH_COOKIE_SECURE=true` behind HTTPS) in production.

---

## What the system provides

- **Dashboard** — login, protected layout, summary cards, animated office
  overview (fan spin / light glow), current room-power chart, and active alerts.
  Light/dark themes, responsive sidebar + mobile sheet. All data via NestJS APIs
  (no polling, no direct Supabase access); live updates via one Socket.IO
  connection that invalidates the `devices`/`usage`/`alerts` queries.
- **REST API** — devices, usage, active alerts, health, auth — documented with
  Swagger (Bearer auth) at `/api/docs` (`/api/docs-json` for the OpenAPI JSON).
  There are **no history endpoints**.
- **Socket.IO** — `state:snapshot`, `device:update`, `usage:update`,
  `alert:new`, `alert:resolved` (all behind token auth).
- **Simulator, current power/kWh, alerts, Discord bot** — all read the same
  in-memory state; see the backend README.

---
## Project Resources

- **System Diagram:** [Google Drive](https://drive.google.com/file/d/1qPVH_9wjTWPMwGA5Z9x8fgEdsb8bzTNL/view?usp=sharing)
- **Circuit Design:** [Wokwi Simulation](https://wokwi.com/projects/468569520832947201)
- **Discord Bot / Server:** [Join Discord](https://discord.gg/5BHAa2k5m)
---