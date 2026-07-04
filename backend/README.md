# Office Device Monitor — Backend

One NestJS application that simulates office lights/fans **in memory** and
exposes that shared state through a **REST API**, a **Socket.IO** gateway, and a
**Discord bot** — all in a single process. **PostgreSQL (via Prisma) is used
only for authentication** (`User`, `RefreshSession`); device, usage and alert
state live in backend memory and reset on restart.

> **Device-count assumption:** the source problem statement is inconsistent
> (it mentions both 5 and 6 devices per room). This implementation follows the
> mathematically consistent configuration from `PROJECT_BRIEF.md`:
> **3 rooms × (2 fans + 3 lights) = 15 devices** (6 fans, 9 lights). Not 18.

---

## Table of contents

- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Supabase configuration](#supabase-configuration)
- [Prisma: migrate, generate, seed](#prisma-migrate-generate-seed)
- [Running the backend](#running-the-backend)
- [Environment variables](#environment-variables)
- [REST API](#rest-api)
- [Socket.IO events](#socketio-events)
- [Discord bot](#discord-bot)
- [Simulator](#simulator)
- [Power & energy (kWh)](#power--energy-kwh)
- [Alert rules](#alert-rules)
- [Testing](#testing)
- [Project structure](#project-structure)

---

## Architecture

```
Simulator ─┐
Demo PATCH ─┼─► DevicesService  (in-memory Map<string, Device>  — source of truth)
           │        └─ emits device.updated
           ▼
     Internal event bus (@nestjs/event-emitter)
           │              │                     │
   UsageService     AlertsService         Socket.IO Gateway / Discord bot
 (kWh accumulator)  (active alert Map)    (read the same in-memory services)
           │
           └─ emits usage.updated ; AlertsService emits alert.triggered/resolved
```

> **Devices, usage and active alerts are simulated and held in backend memory.
> They reset when the process restarts. PostgreSQL is used only for
> authentication (`User`, `RefreshSession`).**

Rules enforced by this codebase:

- **In-memory `DevicesService` is the single source of truth** for REST,
  Socket.IO, `UsageService`, `AlertsService`, the simulator and the Discord bot.
  No module keeps a second copy of device state.
- `UsageService` and `AlertsService` react to `device.updated`; the gateway and
  Discord read the same services (no polling).
- Prisma / PostgreSQL is used **only** by the auth module.

---

## Tech stack

NestJS 11 · TypeScript · Prisma 6 · PostgreSQL (Supabase) · Socket.IO 4 ·
discord.js 14 · `@nestjs/schedule` · `@nestjs/event-emitter` · Jest.

Package manager: **npm** (a `package-lock.json` is produced on install).

---

## Prerequisites

- Node.js 20+
- npm 10+
- A Supabase project (free tier is fine) **or** any reachable PostgreSQL 14+
- (Optional) A Discord bot token for the bot features

---

## Installation

```bash
cd backend
cp .env.example .env      # then edit .env with your values
npm install
npm run prisma:generate
```

---

## Supabase configuration

1. Create a project at <https://supabase.com>.
2. In **Project Settings → Database → Connection string**, copy the URI.
3. Put it in `.env` as `DATABASE_URL`. Two common forms:

   ```env
   # Direct connection (port 5432) — simplest, good for local dev & migrations
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.<ref>.supabase.co:5432/postgres?schema=public"

   # Pooled connection (port 6543) — for serverless/high-concurrency runtime
   # DATABASE_URL="postgresql://postgres.<ref>:YOUR_PASSWORD@aws-0-...pooler.supabase.com:6543/postgres?pgbouncer=true"
   ```

   If you use the pooled URL at runtime, keep a direct URL for migrations. This
   schema also supports an optional `DIRECT_URL` if you wish to wire it in.

> **Never commit real credentials.** `.env` is git-ignored; only `.env.example`
> (with placeholders) is tracked. The app never logs `DATABASE_URL`, database
> passwords, Supabase secrets or the Discord token.

---

## Prisma: migrate, generate, seed

```bash
npm run prisma:format         # format schema
npm run prisma:validate       # validate schema
npm run prisma:generate       # regenerate client

# Apply migrations
npm run prisma:migrate:deploy # apply committed migrations (CI / shared DB)
# or, when changing the schema locally:
npm run prisma:migrate:dev

# Seed the ADMIN + VIEWER auth users (idempotent — safe to run repeatedly)
npm run prisma:seed
```

The database holds **only** `User` and `RefreshSession`. The seed upserts the two
auth users from the `SEED_*` env vars; the 15 devices are seeded into memory on
startup and are not part of the database.

> ⚠️ The `20260704000000_monitoring_to_memory` migration **drops** the old
> monitoring tables (`Device`, `DeviceStateHistory`, `PowerSnapshot`, `Alert`)
> and their enums while preserving `User`/`RefreshSession`. It never runs
> `migrate reset`. On a shared/production database, review the SQL and run
> `npm run prisma:migrate:deploy` deliberately.

---

## Running the backend

```bash
npm run start:dev     # watch mode
npm run build         # compile to dist/
npm run start:prod    # run compiled build (node dist/main.js)
```

- REST base: `http://localhost:3001`
- Swagger UI: `http://localhost:3001/api/docs` · OpenAPI JSON: `http://localhost:3001/api/docs-json`
- Health: `http://localhost:3001/health`

**Missing Discord token:** the backend logs a warning, keeps REST and Socket.IO
fully running, reports `discord.ready: false` on `/health`, and does not crash.

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP port |
| `DATABASE_URL` | — (**required**) | PostgreSQL / Supabase connection string |
| `DIRECT_URL` | _(optional)_ | Direct (non-pooled) URL for migrations |
| `DASHBOARD_ORIGIN` | `http://localhost:3000` | CORS origin for REST + Socket.IO |
| `OFFICE_TIMEZONE` | `Asia/Dhaka` | Timezone for office hours & daily kWh |
| `OFFICE_START_HOUR` | `9` | Office start hour (0–23) |
| `OFFICE_END_HOUR` | `17` | Office end hour (must be > start) |
| `SIMULATOR_ENABLED` | `true` | Enable the device simulator |
| `SIMULATOR_INTERVAL_MS` | `10000` | Simulator tick interval |
| `ALERT_EVALUATION_INTERVAL_MS` | `60000` | Periodic alert re-evaluation interval |
| `DISCORD_BOT_TOKEN` | _(optional)_ | Discord bot token (bot disabled if absent) |
| `DISCORD_ALERT_CHANNEL_ID` | _(optional)_ | Channel ID for proactive alerts |
| `DISCORD_COMMAND_PREFIX` | `!` | Command prefix |
| `SWAGGER_ENABLED` | `true` | Register Swagger UI/JSON (`false` disables both) |
| `JWT_ACCESS_SECRET` | _(random per-process)_ | Access-token signing secret (**set in prod**) |
| `JWT_REFRESH_SECRET` | _(random per-process)_ | Refresh-hash secret (**set in prod**) |
| `JWT_ACCESS_TTL` | `15m` | Access-token lifetime |
| `JWT_REFRESH_TTL_DAYS` | `7` | Refresh-token lifetime (days) |
| `AUTH_COOKIE_SECURE` | `false` | `Secure` flag on the refresh cookie (`true` behind HTTPS) |
| `AUTH_COOKIE_SAME_SITE` | `lax` | `SameSite` for the refresh cookie (`lax`/`strict`/`none`) |
| `SEED_ADMIN_NAME` / `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | — | Seeded ADMIN user |
| `SEED_VIEWER_NAME` / `SEED_VIEWER_EMAIL` / `SEED_VIEWER_PASSWORD` | — | Seeded VIEWER user |

All values are validated at startup (`src/config/env.validation.ts`). Invalid
config aborts boot with a message that lists offending keys **without** printing
their values.

---

## Authentication & authorization

Backend-managed JWT auth. Passwords are **bcrypt**-hashed. Login returns a
short-lived **access JWT** (default 15 min) in the JSON body (the SPA keeps it in
memory) plus a rotating **refresh token** (default 7 days) delivered as an
**HttpOnly cookie**; only the refresh token's SHA-256 **hash** is stored in
PostgreSQL. Refresh **rotates** (revokes the presented session, issues a new one)
and logout revokes it. Invalid credentials return a **generic** error.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | public | `{ email, password }` → `{ accessToken, user }` (+ sets refresh cookie) |
| `POST` | `/api/auth/refresh` | cookie | Rotate refresh cookie → new `{ accessToken, user }` |
| `POST` | `/api/auth/logout` | cookie | Revoke the session, clear the cookie |
| `GET` | `/api/auth/me` | Bearer | Current user (no `passwordHash`) |

**Guards** (global): `JwtAuthGuard` requires a valid `Authorization: Bearer`
token except on `@Public()` routes (`/health`, Swagger, login, refresh);
`RolesGuard` enforces `@Roles(...)`. Reusable `@CurrentUser()` injects the user.
Unauthenticated → **401**, insufficient role → **403**.

| Capability | ADMIN | VIEWER |
|---|:--:|:--:|
| Read devices / usage / active alerts | ✅ | ✅ |
| `PATCH /api/devices/:id/status` | ✅ | ❌ (403) |

**Seed users:** `npm run prisma:seed` idempotently upserts one ADMIN + one VIEWER
from the `SEED_*` env vars (skipped with a warning if unset). Choose strong,
unique passwords — the values in `.env.example` are demo placeholders only.

**Socket.IO** connections must present the access token in the handshake
(`socket.auth = { token }` or an `Authorization: Bearer` header); missing/invalid/
expired tokens are rejected before any events are sent.

---

## REST API

Base URL: `http://localhost:<PORT>`. All `/api/*` data routes require a Bearer
access token (see Authentication). Global validation strips unknown fields,
transforms types, and returns `400` on invalid input.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness + DB/Discord readiness (no secrets, public) |
| `GET` | `/api/devices` | All 15 devices |
| `GET` | `/api/devices?room=drawing\|work1\|work2` | Devices in a room |
| `GET` | `/api/devices/:id` | One device |
| `GET` | `/api/usage` | Current watts, room breakdown, today's kWh |
| `GET` | `/api/alerts` | Active alerts (in-memory) |
| `PATCH` | `/api/devices/:id/status` | **[ADMIN]** manually set status |

> There are **no history endpoints** — monitoring data is not persisted.

**Device shape**

```json
{ "id": "drawing-fan-1", "type": "fan", "room": "drawing",
  "label": "Fan 1", "status": "off", "wattage": 60,
  "lastChanged": "2026-07-03T10:00:00.000Z" }
```

**Usage shape**

```json
{ "currentWatts": 225, "todayKwh": 1.4325,
  "roomBreakdown": { "drawing": 75, "work1": 60, "work2": 90 },
  "calculatedAt": "2026-07-03T10:30:00.000Z" }
```

**Demo PATCH** (`/api/devices/:id/status`, body `{ "status": "on" | "off" }`,
**ADMIN only**) mutates the in-memory device (updating `lastChanged` only on a
real change) and emits `device:update` / `usage:update`.

### API docs (Swagger / OpenAPI)

When `SWAGGER_ENABLED=true` (default):

- Swagger UI: **`/api/docs`**
- OpenAPI JSON: **`/api/docs-json`**

Set `SWAGGER_ENABLED=false` to register neither route (both return `404`).

---

## Socket.IO events

The gateway holds no independent state — every payload comes from the shared
in-memory services. Connections require a valid access token in the handshake.
CORS origin = `DASHBOARD_ORIGIN`.

**On connect** the server emits `state:snapshot`:

```json
{ "devices": [ /* DeviceView[] */ ],
  "usage":   { /* UsageSnapshot */ },
  "alerts":  [ /* active AlertView[] */ ] }
```

**Live events** (internal event → socket event):

| Internal | Socket event | Payload |
|---|---|---|
| `device.updated` | `device:update` | `DeviceView` |
| `usage.updated` | `usage:update` | `UsageSnapshot` |
| `alert.triggered` | `alert:new` | `AlertView` |
| `alert.resolved` | `alert:resolved` | `AlertView` |

There is **no `history:invalidate` event** — clients keep the current
`devices`/`usage`/`alerts` in sync from these live events.

Client example:

```js
import { io } from 'socket.io-client';
const s = io('http://localhost:3001', { auth: { token: accessToken } });
s.on('state:snapshot', (snap) => { /* initial state */ });
s.on('device:update', (device) => { /* live device change */ });
s.on('usage:update', (usage) => { /* live power */ });
s.on('alert:new', (alert) => { /* new alert */ });
s.on('alert:resolved', (alert) => { /* alert cleared */ });
```

---

## Discord bot

The bot runs **inside** the NestJS process and injects `DevicesService`,
`UsageService` and `AlertsService` — all answers come from committed DB state.

### Developer-portal setup

1. Go to <https://discord.com/developers/applications> → **New Application**.
2. **Bot** tab → **Add Bot** → copy the **token** into `DISCORD_BOT_TOKEN`.
3. Enable **MESSAGE CONTENT INTENT** (Bot → Privileged Gateway Intents).
4. **OAuth2 → URL Generator**: scope `bot`, permissions *Send Messages* +
   *Read Message History*. Open the URL to invite the bot to your server.
5. (Proactive alerts) Enable Developer Mode in Discord, right-click the target
   channel → **Copy Channel ID** → set `DISCORD_ALERT_CHANNEL_ID`.

### Commands (prefix configurable via `DISCORD_COMMAND_PREFIX`, default `!`)

| Command | Response |
|---|---|
| `!status` | Per-room summary, active fan/light counts, total watts |
| `!room <name>` | Every device + status, active counts, room watts, latest change |
| `!usage` | Current office watts, today's kWh estimate, top-consuming room |
| `!alerts` | Active alerts, or a friendly all-clear (bonus) |

`!room` accepts: `drawing`, `drawing room`, `work1`, `work room 1`, `work2`,
`work room 2` (case-insensitive). Commands are parsed case-insensitively, use
correct singular/plural grammar, never return raw JSON, ignore bot-authored
messages, and handle invalid input with guidance.

### Proactive alerts

On `alert.triggered` (and `alert.resolved`), the alert is posted to
`DISCORD_ALERT_CHANNEL_ID`. Missing token/channel, bot-not-ready, channel-not-
found, non-text channel, missing permissions and Discord API errors are all
handled safely — **a Discord failure never crashes NestJS**.

### Timestamp format (Bangladesh, 12-hour)

The database and REST/Socket.IO payloads always use **UTC ISO-8601** strings.
**Only Discord-visible** timestamps are rendered in the office timezone
(`OFFICE_TIMEZONE`, default `Asia/Dhaka`) with a 12-hour clock and uppercase
AM/PM:

- full date-time → `03 Jul 2026, 10:30 PM`
- time-only → `10:30 PM`

This is produced by one reusable formatter (`src/discord/discord-time.util.ts`,
`Intl.DateTimeFormat` with locale `en-BD`) — no manual 6-hour offset — and is
applied to proactive alerts, resolved-alert messages, `!alerts`, and the latest
device-change time in `!room`.

---

## Simulator

Every `SIMULATOR_INTERVAL_MS` (default 10s) it picks one of the 15 fixed
devices, reads its committed status and toggles it **through `DevicesService`**,
so it uses the identical transactional path as manual changes. Overlapping runs
are prevented; simulator errors are logged and never crash the app. Disable with
`SIMULATOR_ENABLED=false`.

---

## Power & energy (kWh) — in memory

- **Current watts** = sum of `wattage` for every `ON` device (fan 60 W, light
  15 W, OFF 0 W), computed directly from the in-memory device map. Room
  breakdown is the same, split by room.
- **Today's kWh** is an in-memory estimate accumulated over actual elapsed time
  (no database rows):

  ```
  energyKwh += wattsInEffect × elapsedHours / 1000
  ```

  The accumulator advances on a lightweight ~30 s tick **and** whenever a device
  changes — the interval before a change is attributed to the previous total, so
  nothing is double-counted. It **resets at local midnight** in `OFFICE_TIMEZONE`.
- **Reset behavior:** the daily estimate (and all device/alert state) is **not
  persisted** and resets when the backend restarts — expected for simulated data.

---

## Alert rules

**Rule 1 — After-hours device.** Any device `ON` while local time is outside
`09:00–17:00` raises one active `AFTER_HOURS` alert per device
(`activeKey = after-hours:<device-id>`). Resolves when the device turns OFF or
office hours begin.

**Rule 2 — Whole room ON > 2 hours.** When all 5 devices in a room are ON and
every device's `lastChanged` is older than 2 hours, one active
`ALL_DEVICES_ON_TOO_LONG` alert per room is raised
(`activeKey = all-on-too-long:<room-id>`). Resolves when any device in the room
turns OFF.

Active alerts live in an in-memory `Map` keyed by a stable dedupe key
(`after-hours:<device-id>` / `all-on-too-long:<room-id>`), so there is exactly
one active alert per condition. When a condition first becomes true the alert is
added and `alert:new` is emitted; while it stays true nothing changes; when it
resolves the entry is removed and `alert:resolved` is emitted. **No alert history
is stored.** Evaluation runs after every device change **and** on a schedule
(`ALERT_EVALUATION_INTERVAL_MS`). Timestamps use Bangladesh 12-hour formatting in
Discord messages.

---

## Testing

```bash
npm test            # unit tests (Jest)
npm run test:cov    # with coverage
npm run typecheck   # tsc --noEmit
npm run lint:check  # eslint (no fixes)
```

Time-dependent logic uses an injectable `ClockService`; tests pass explicit
reference dates and a small in-memory Prisma fake (`src/testing/`, auth only), so
**no database is required** to run the suite. Coverage includes: 15 in-memory
devices seeded, unchanged-status writes nothing/emits nothing, actual change
updates + emits, current total & room power, elapsed-time kWh accumulation and
local-midnight reset, both alert rules (trigger once, clear on resolve), Discord
command parsing/aliases/grammar/12-hour timestamps, auth (login/hashing/refresh
rotation/reuse rejection/logout/me), guards (401/403/role), Socket.IO handshake
auth, and that Swagger exposes no history routes.

---

## Production deployment

```bash
cd backend
npm ci                          # clean, lockfile-exact install
cp .env.example .env            # set real DATABASE_URL + Discord vars in .env
npm run prisma:generate
npm run prisma:migrate:deploy   # apply committed migrations (never `migrate reset`)
npm run prisma:seed             # idempotent — safe to re-run
npm run build                   # compile to dist/
npm run start:prod              # node dist/main.js
```

Recommended production settings: `SIMULATOR_ENABLED=false` (unless you want the
demo simulator), `SWAGGER_ENABLED=false` (or keep it behind auth), a pooled
`DATABASE_URL`, and process supervision (PM2/systemd/container) with the port
from `PORT`. `/health` is a ready-made liveness/readiness probe.

---

## Project structure

```
backend/
├── prisma/
│   ├── schema.prisma          # User, RefreshSession, Role (auth only)
│   ├── migrations/            # committed SQL migrations
│   └── seed.ts                # idempotent 15-device seed
├── src/
│   ├── main.ts                # bootstrap, ValidationPipe, CORS, Socket.IO adapter, Swagger
│   ├── app.module.ts
│   ├── config/                # env validation + config keys
│   ├── common/                # constants (15 devices), ClockService, power calc, events, DTOs
│   ├── database/              # DatabaseModule + shared PrismaService
│   ├── devices/               # DevicesService (transaction), controller, DTOs
│   ├── usage/                 # UsageService (kWh) + periodic power snapshots
│   ├── alerts/                # AlertsService (both rules) + scheduler
│   ├── simulator/             # scheduled device toggler
│   ├── realtime/              # Socket.IO gateway + CORS adapter
│   ├── discord/               # bot lifecycle, command service, formatter, proactive alerts
│   ├── health/                # /health
│   └── testing/               # in-memory Prisma fake (tests only)
└── .env.example
```
