# Project Brief: Office Device Monitor  
## “Lights, Fans, Discord: The Boss’s Big Idea”

---

## 1. Project Context

This is a hackathon project for monitoring office electrical devices and electricity usage through:

- a real-time web dashboard,
- a Discord bot,
- one shared NestJS backend,
- and a persistent PostgreSQL database hosted on Supabase.

No physical hardware is required. All device data is simulated and changes dynamically over time.

The dashboard and Discord bot must always reflect the same committed backend state.

---

## 2. Problem Statement Alignment

The solution must satisfy the following core requirements:

1. Simulate the live state of office lights and fans.
2. Show all device states on a real-time web dashboard.
3. Show current office-wide and room-wise power consumption.
4. Detect and display active alerts.
5. Provide Discord commands for checking office status and power usage.
6. Keep the dashboard and Discord bot synchronized through one shared backend.
7. Submit a high-level system diagram.
8. Submit a sensible hardware/electrical schematic for one representative room.
9. Maintain a public repository with documentation.
10. Prepare a concise demo video.

---

## 3. Device Count Assumption

The source problem statement is inconsistent in multiple places.

It defines each room as containing:

- 2 fans
- 3 lights

That equals:

- 5 devices per room
- 15 devices across 3 rooms
- 6 fans total
- 9 lights total

Some parts of the source document incorrectly mention 6 devices per room or 18 devices total.

This implementation follows the mathematically consistent configuration:

- 3 rooms
- 2 fans per room
- 3 lights per room
- 15 devices total

This assumption must be mentioned in the README and demo.

---

## 4. Office Layout

The office contains three rooms:

### Drawing Room

- Room ID: `drawing`
- Usage: waiting area
- Devices:
  - Fan 1
  - Fan 2
  - Light 1
  - Light 2
  - Light 3

### Work Room 1

- Room ID: `work1`
- Usage: employee workspace
- Devices:
  - Fan 1
  - Fan 2
  - Light 1
  - Light 2
  - Light 3

### Work Room 2

- Room ID: `work2`
- Usage: employee workspace
- Devices:
  - Fan 1
  - Fan 2
  - Light 1
  - Light 2
  - Light 3

Power ratings:

- Fan: 60 W while ON
- Light: 15 W while ON
- OFF device: 0 W

Office hours:

- Start: 09:00
- End: 17:00
- Default timezone: `Asia/Dhaka`

---

## 5. Confirmed Technical Decisions

Do not deviate from these decisions without asking first.

### Backend and Discord

- NestJS
- TypeScript
- Socket.IO
- `discord.js`
- `@nestjs/schedule`
- `@nestjs/event-emitter`
- Prisma ORM
- Supabase-hosted PostgreSQL
- One NestJS application containing:
  - REST API
  - device simulator
  - Socket.IO gateway
  - usage calculation
  - alert engine
  - database persistence
  - Discord bot

The Discord bot is a NestJS module inside the same process.

It must not:

- run as a separate service,
- call the backend through HTTP,
- create a separate Prisma client,
- or connect directly to Supabase.

### Dashboard

- Next.js
- shadcn/ui
- `socket.io-client`
- REST API for initial loading
- Socket.IO for live updates
- no polling
- no manual refresh
- no direct Supabase access

### Database

- Supabase PostgreSQL is the persistent source of truth.
- Prisma is the only database access layer.
- Current device state, device history, power history, and alert history must survive backend restarts.
- Do not use an in-memory `Map` as the authoritative store.
- Temporary non-authoritative caching is allowed only if it never replaces the database truth.

---

## 6. Scope Classification

### Mandatory Features

- Dynamic simulated device data
- Shared backend
- Real-time dashboard
- Live device status
- Total power consumption
- Room-wise power consumption
- Active alert panel
- Discord `!status`
- Discord `!room <name>`
- Discord `!usage`
- High-level system diagram
- Hardware/electrical schematic
- Public repository
- README
- Demo video

### Implementation Decisions

- NestJS
- Next.js
- Socket.IO
- Prisma
- Supabase PostgreSQL
- Persistent device state
- Persistent device history
- Persistent power history
- Persistent alert history

### Bonus Features

- Animated office layout
- Glowing light indicators
- Spinning fan icons
- Historical power chart
- Discord `!alerts`
- Proactive Discord alert posting
- LLM-generated bot phrasing

Mandatory work must be completed before bonus work.

---

## 7. High-Level Architecture

```text
Simulated Device Layer
        |
        v
NestJS DevicesService
        |
        v
Prisma ORM
        |
        v
Supabase PostgreSQL
        |
        +------------------------+
        |                        |
        v                        v
Internal Domain Events      REST Endpoints
        |
        +------------------------+
        |
        +--------------+----------------+
        |                               |
        v                               v
Socket.IO Gateway               Discord Module
        |                               |
        v                               v
Next.js Dashboard               Discord Users
```

Architecture rules:

- PostgreSQL is the source of truth.
- Events must be emitted only after successful database writes.
- The dashboard must access data only through NestJS REST and Socket.IO.
- The Discord bot must use injected NestJS services directly.
- No module may maintain an independent copy of device state.
- Dashboard and Discord must always reflect the same committed state.

---

## 8. High-Level System Diagram Deliverable

Create the final diagram manually using a non-Mermaid tool.

Recommended tools:

- draw.io
- Figma
- Excalidraw
- Canva
- PowerPoint shapes

Save the final output as:

```text
docs/system-diagram.png
```

The diagram must show:

1. Simulated device layer
2. NestJS backend
3. DevicesService
4. Prisma ORM
5. Supabase PostgreSQL
6. REST API
7. Socket.IO gateway
8. Internal event flow
9. Next.js dashboard
10. Discord bot
11. Browser user
12. Discord user
13. Alert propagation
14. Device update propagation

The ASCII architecture in this brief is only an engineering reference. It is not the final submission diagram.

---

## 9. Hardware/Electrical Schematic Deliverable

Create one representative room circuit manually in Wokwi or Tinkercad.

The circuit must represent:

- 1 ESP32 or Arduino
- 3 lights represented by LEDs
- 2 fans represented by DC motors or suitable simulated loads
- LED resistors
- transistor, MOSFET, relay, or driver stages for fans
- flyback protection where motors are used
- common ground
- optional current sensor

Electrical rules:

- Motors must not be connected directly to microcontroller GPIO pins.
- Low-voltage simulation components should represent the real-world devices.
- No real 220 V wiring is required.
- Only one room needs to be represented.
- No physical hardware is required.

Store the following under:

```text
docs/wokwi-schematic/
```

Required files or references:

- schematic screenshot
- public Wokwi or Tinkercad project link
- pin-mapping table
- short wiring explanation
- electrical reasoning

Do not generate or commit a complete simulator project JSON solely through AI. Build and verify the schematic in the simulator interface.

---

## 10. Repository Layout

```text
office-monitor/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   ├── health/
│   │   ├── database/
│   │   ├── common/
│   │   ├── devices/
│   │   ├── usage/
│   │   ├── history/
│   │   ├── alerts/
│   │   ├── realtime/
│   │   └── discord/
│   ├── .env.example
│   └── package.json
├── dashboard/
│   └── app/
│       ├── page.tsx
│       └── components/
│           ├── DeviceGrid.tsx
│           ├── PowerMeter.tsx
│           ├── AlertsPanel.tsx
│           ├── PowerHistoryChart.tsx
│           └── OfficeLayout.tsx
├── docs/
│   ├── system-diagram.png
│   └── wokwi-schematic/
├── .gitignore
└── README.md
```

The exact filenames may differ if the existing repository already follows a sensible structure.

---

## 11. Core Domain Types

```ts
type DeviceType = 'fan' | 'light';
type DeviceStatus = 'on' | 'off';
type RoomId = 'drawing' | 'work1' | 'work2';

interface Device {
  id: string;
  type: DeviceType;
  room: RoomId;
  label: string;
  status: DeviceStatus;
  wattage: number;
  lastChanged: string;
}
```

Expected IDs:

```text
drawing-fan-1
drawing-fan-2
drawing-light-1
drawing-light-2
drawing-light-3

work1-fan-1
work1-fan-2
work1-light-1
work1-light-2
work1-light-3

work2-fan-1
work2-fan-2
work2-light-1
work2-light-2
work2-light-3
```

---

## 12. Database Requirements

### Prisma

Use Prisma ORM for all PostgreSQL access.

Create:

```text
backend/prisma/schema.prisma
backend/prisma/migrations/
backend/prisma/seed.ts
backend/src/database/database.module.ts
backend/src/database/prisma.service.ts
```

`PrismaService` must:

- be provided through one shared `DatabaseModule`,
- connect during application startup,
- disconnect during graceful shutdown,
- never log database credentials,
- be injected into services,
- never be instantiated independently inside feature modules.

Database failure must not silently fall back to in-memory persistence.

---

## 13. Prisma Enums

```prisma
enum DeviceType {
  FAN
  LIGHT
}

enum DeviceStatus {
  ON
  OFF
}

enum Room {
  DRAWING
  WORK1
  WORK2
}

enum ChangeSource {
  SIMULATOR
  MANUAL
  SYSTEM
}

enum AlertType {
  AFTER_HOURS
  ALL_DEVICES_ON_TOO_LONG
}
```

---

## 14. Prisma Models

### Device

Stores the current state of each device.

```prisma
model Device {
  id          String               @id
  type        DeviceType
  room        Room
  label       String
  status      DeviceStatus         @default(OFF)
  wattage     Int
  lastChanged DateTime             @default(now())
  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt
  history     DeviceStateHistory[]
  alerts      Alert[]

  @@index([room])
  @@index([status])
  @@index([type])
}
```

Requirements:

- exactly 15 fixed device rows,
- no duplicate IDs,
- current state survives backend restart.

### DeviceStateHistory

Stores every real status transition.

```prisma
model DeviceStateHistory {
  id             String       @id @default(cuid())
  deviceId       String
  previousStatus DeviceStatus
  newStatus      DeviceStatus
  source         ChangeSource
  changedAt      DateTime     @default(now())
  device         Device       @relation(fields: [deviceId], references: [id], onDelete: Cascade)

  @@index([deviceId, changedAt])
  @@index([changedAt])
  @@index([source])
}
```

Rules:

- one real state change creates one row,
- setting the same status creates no row,
- seeding must not delete history.

### PowerSnapshot

Stores historical power values.

```prisma
model PowerSnapshot {
  id           String   @id @default(cuid())
  totalWatts   Int
  drawingWatts Int
  work1Watts   Int
  work2Watts   Int
  recordedAt   DateTime @default(now())

  @@index([recordedAt])
}
```

Create snapshots:

- after every real device state change,
- periodically every 60 seconds.

### Alert

Stores active and resolved alerts.

```prisma
model Alert {
  id          String     @id @default(cuid())
  dedupeKey   String
  activeKey   String?    @unique
  type        AlertType
  room        Room?
  deviceId    String?
  message     String
  triggeredAt DateTime   @default(now())
  resolvedAt  DateTime?
  active      Boolean    @default(true)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  device      Device?    @relation(fields: [deviceId], references: [id], onDelete: SetNull)

  @@index([active])
  @@index([type])
  @@index([triggeredAt])
  @@index([dedupeKey])
}
```

Alert deduplication behavior:

```text
New active alert:
activeKey = dedupeKey

Resolved alert:
active = false
activeKey = null
resolvedAt = current timestamp
```

This ensures:

- only one active alert per condition,
- historical alert occurrences remain stored,
- the same condition can create a new future occurrence after resolution.

---

## 15. Database Seeding

Create an idempotent Prisma seed.

Seed exactly 15 devices.

### Drawing Room

```text
drawing-fan-1
drawing-fan-2
drawing-light-1
drawing-light-2
drawing-light-3
```

### Work Room 1

```text
work1-fan-1
work1-fan-2
work1-light-1
work1-light-2
work1-light-3
```

### Work Room 2

```text
work2-fan-1
work2-fan-2
work2-light-1
work2-light-2
work2-light-3
```

Seed rules:

- fan wattage: 60
- light wattage: 15
- repeated seeds must not duplicate devices
- repeated seeds must not erase history
- startup may verify missing fixed devices
- startup must not create extra devices

---

## 16. Devices Module

`DevicesService` must provide at least:

```ts
getAll()
getById(id)
getByRoom(room)
setStatus(id, status, source)
toggleStatus(id, source)
getRoomSummary(room)
getOfficeSummary()
```

Requirements:

- query PostgreSQL through Prisma,
- validate IDs, rooms, and status values,
- throw appropriate NestJS exceptions,
- update `lastChanged` only when status changes,
- never duplicate state in memory,
- perform writes transactionally,
- emit events only after commit.

---

## 17. Device Update Transaction

Every state change must run through a Prisma transaction.

Required flow:

1. Read the current device.
2. Return without mutation if the requested status already matches.
3. Update device status.
4. Update `lastChanged`.
5. Insert one history record.
6. Calculate updated office and room power.
7. Insert one power snapshot.
8. Commit the transaction.
9. Emit `device.updated`.
10. Emit `usage.updated`.
11. Evaluate alerts.

If the transaction fails:

- do not emit events,
- do not broadcast Socket.IO updates,
- do not notify Discord,
- log a safe error,
- do not expose credentials.

Concurrent writes must not create inconsistent history.

---

## 18. Simulator Service

Use `@nestjs/schedule`.

Default flow:

```text
Every 10 seconds:
1. select one fixed device ID,
2. read its current state from PostgreSQL,
3. toggle it through DevicesService,
4. let DevicesService run the transaction,
5. emit events only after commit.
```

Configuration:

```env
SIMULATOR_ENABLED=true
SIMULATOR_INTERVAL_MS=10000
```

Requirements:

- no second device-state store,
- no random bot responses,
- no overlapping simulator execution,
- safe logging,
- simulator errors must not crash the application.

---

## 19. Usage Module

Required methods:

```ts
getCurrentWatts()
getRoomBreakdown()
getTodayKwh()
getUsageSnapshot()
```

Example:

```json
{
  "currentWatts": 225,
  "todayKwh": 1.4325,
  "roomBreakdown": {
    "drawing": 75,
    "work1": 60,
    "work2": 90
  },
  "calculatedAt": "2026-07-03T10:30:00.000Z"
}
```

### Current watts

```text
Sum the wattage of all devices whose status is ON.
```

### Room breakdown

Calculate active power for:

- drawing
- work1
- work2

### Daily kWh

Calculate today’s energy from persisted `PowerSnapshot` rows.

Required logic:

1. Determine midnight in `OFFICE_TIMEZONE`.
2. Load the latest snapshot at or before midnight.
3. Load snapshots after midnight in chronological order.
4. Treat each snapshot as active until the next snapshot.
5. Integrate watts over elapsed seconds.
6. Include the final interval up to the current time.
7. Convert watt-seconds to kWh.
8. Avoid double-counting duplicate timestamps.
9. Document fallback behavior if no pre-midnight snapshot exists.

Formula:

```text
kWh = watt-seconds / 3,600,000
```

The calculation must survive backend restart.

---

## 20. Power Snapshot Scheduler

Save a periodic snapshot in addition to state-change snapshots.

Configuration:

```env
POWER_SNAPSHOT_INTERVAL_MS=60000
```

Requirements:

- query committed device state,
- calculate room and office totals,
- insert one snapshot,
- prevent overlapping runs,
- avoid duplicate writes,
- log failures safely.

---

## 21. Alerts Module

### Rule 1: After-Hours Device

A device that is ON outside office hours must create an active alert.

Office hours:

```text
09:00 <= office time < 17:00
```

Recommended dedupe key:

```text
after-hours:<device-id>
```

Resolve when:

- the device turns OFF,
- or office hours begin.

### Rule 2: Entire Room ON for More Than 2 Hours

Create an alert when:

- all five devices in a room are ON,
- every device has remained continuously ON for more than two hours,
- each device’s `lastChanged` is before the two-hour threshold.

Recommended dedupe key:

```text
all-on-too-long:<room-id>
```

Resolve when:

- any device in the room turns OFF.

Required methods:

```ts
getActiveAlerts()
getAlertHistory(filters)
evaluateAll()
```

Evaluation must happen:

- after each committed device change,
- on a recurring schedule.

Configuration:

```env
ALERT_EVALUATION_INTERVAL_MS=60000
```

Emit:

```text
alert.triggered
alert.resolved
```

Only emit after the database write succeeds.

---

## 22. Internal Events

Use `@nestjs/event-emitter`.

Required event names:

```text
device.updated
usage.updated
alert.triggered
alert.resolved
```

Payloads must be strongly typed.

Recommended flow:

```text
Status change
    |
    v
Prisma transaction
    |
    v
Commit
    |
    +--> device.updated
    +--> usage.updated
    |
    v
Alert evaluation
    |
    +--> alert.triggered
    +--> alert.resolved
```

Avoid circular dependencies.

---

## 23. Socket.IO Gateway

Required outgoing events:

```text
state:snapshot
device:update
usage:update
alert:new
alert:resolved
```

Mapping:

```text
device.updated   -> device:update
usage.updated    -> usage:update
alert.triggered  -> alert:new
alert.resolved   -> alert:resolved
```

On client connection:

- log the connection at debug level,
- emit a complete initial snapshot.

Suggested snapshot:

```json
{
  "devices": [],
  "usage": {},
  "alerts": []
}
```

Rules:

- no independent gateway state,
- no client polling,
- CORS configured through environment variables.

---

## 24. REST API

Recommended global prefix:

```text
/api
```

Required endpoints:

```text
GET /api/devices
GET /api/devices?room=drawing
GET /api/devices?room=work1
GET /api/devices?room=work2
GET /api/devices/:id

GET /api/usage

GET /api/alerts
GET /api/alerts/history

GET /api/history/devices
GET /api/history/power

GET /health
```

Optional demo endpoint:

```text
PATCH /api/devices/:id/status
```

Body:

```json
{
  "status": "on"
}
```

This endpoint must:

- be marked as a simulation/demo control,
- use validation,
- create history,
- create a power snapshot,
- emit the same events as simulator-driven changes.

History filters:

```text
deviceId
room
from
to
page
limit
```

Requirements:

- validate ISO dates,
- paginate results,
- default limit: 50,
- maximum limit: 100,
- prevent unbounded queries,
- return newest records first where appropriate.

---

## 25. Discord Module

The Discord bot runs inside the NestJS process.

Lifecycle:

- `onModuleInit`
- `onModuleDestroy`

The Discord module must inject:

- `DevicesService`
- `UsageService`
- `AlertsService`

Required environment variables:

```env
DISCORD_BOT_TOKEN=
DISCORD_ALERT_CHANNEL_ID=
DISCORD_COMMAND_PREFIX=!
```

When no Discord token exists:

- log a warning,
- keep REST and Socket.IO running,
- report Discord readiness as false,
- do not crash the backend.

### Required Commands

#### `!status`

Return:

- status summary for all rooms,
- active fan count,
- active light count,
- current total watts.

All values must come from the database-backed services.

#### `!room <name>`

Supported aliases:

```text
drawing
drawing room
work1
work room 1
work2
work room 2
```

Return:

- every device and status,
- active fans,
- active lights,
- current room wattage,
- latest device change.

#### `!usage`

Return:

- current office watts,
- today’s persisted kWh,
- room using the most power.

### Bonus Command

#### `!alerts`

Return:

- active alerts,
- or a friendly normal-status response.

### Command Behavior

- ignore bot-authored messages,
- use configurable prefix,
- parse commands case-insensitively,
- never return raw JSON,
- use correct singular/plural wording,
- use human-readable room names,
- handle invalid input safely,
- prevent unhandled promise rejections.

Template-based responses are the reliable default.

LLM phrasing is optional and must never invent facts.

---

## 26. Proactive Discord Alerts

Listen for `alert.triggered`.

When triggered:

- post to `DISCORD_ALERT_CHANNEL_ID`,
- use the persisted alert record,
- include room or device information,
- include the reason,
- include a timestamp,
- avoid duplicates.

Handle safely:

- missing channel ID,
- bot not ready,
- missing permissions,
- channel not found,
- non-text channel,
- Discord API errors.

Discord posting failures must not crash NestJS.

---

## 27. Health Endpoint

Required:

```text
GET /health
```

Suggested response:

```json
{
  "status": "ok",
  "database": {
    "connected": true
  },
  "discord": {
    "ready": false
  },
  "timestamp": "2026-07-03T10:30:00.000Z"
}
```

Never expose:

- database URL,
- database password,
- Supabase secrets,
- Discord token.

---

## 28. Configuration

Use `@nestjs/config`.

Required environment variables:

```env
PORT=3001

DATABASE_URL=

DASHBOARD_ORIGIN=http://localhost:3000

OFFICE_TIMEZONE=Asia/Dhaka
OFFICE_START_HOUR=9
OFFICE_END_HOUR=17

SIMULATOR_ENABLED=true
SIMULATOR_INTERVAL_MS=10000

POWER_SNAPSHOT_INTERVAL_MS=60000
ALERT_EVALUATION_INTERVAL_MS=60000

HISTORY_DEFAULT_LIMIT=50
HISTORY_MAX_LIMIT=100

DISCORD_BOT_TOKEN=
DISCORD_ALERT_CHANNEL_ID=
DISCORD_COMMAND_PREFIX=!
```

Requirements:

- validate numeric values,
- provide safe defaults,
- never log secrets,
- include `.env.example`,
- ensure `.env` is ignored,
- never expose backend secrets to the dashboard.

---

## 29. Prisma Scripts

Add scripts equivalent to:

```json
{
  "prisma:generate": "prisma generate",
  "prisma:format": "prisma format",
  "prisma:validate": "prisma validate",
  "prisma:migrate:dev": "prisma migrate dev",
  "prisma:migrate:deploy": "prisma migrate deploy",
  "prisma:seed": "prisma db seed",
  "prisma:studio": "prisma studio"
}
```

Rules:

- use migrations,
- do not reset production Supabase,
- do not destroy existing data without approval.

---

## 30. Dashboard Requirements

The dashboard must:

- fetch initial state through REST,
- subscribe to Socket.IO once,
- update without refresh,
- never connect directly to Supabase.

### Live Device Status Panel

- all 15 devices,
- grouped by room,
- clear ON/OFF indicators,
- live updates.

### Live Power Consumption Meter

- total office watts,
- room-wise watts,
- today’s kWh.

### Active Alerts Panel

- active alerts,
- timestamps,
- automatic removal when resolved.

### Historical Power Chart

Recommended bonus:

```text
GET /api/history/power
```

### Office Layout

Bonus:

- top-view SVG or canvas,
- lights glow when ON,
- fans spin when ON.

---

## 31. Testing Requirements

### Devices

- exactly 15 devices seeded,
- each room has 2 fans and 3 lights,
- fans use 60 W,
- lights use 15 W,
- actual change updates timestamp,
- unchanged status does not,
- actual change creates one history row,
- unchanged status creates none.

### Usage

- total watts correct,
- room totals correct,
- OFF devices consume zero,
- snapshots are stored,
- kWh comes from snapshots,
- duplicate timestamps are not double-counted,
- usage survives restart.

### Alerts

- after-hours alert created,
- after-hours alert resolved,
- duplicate active alert prevented,
- room-all-on alert created after two hours,
- room-all-on alert resolved,
- resolved alert remains stored.

### Database

- seed is idempotent,
- transaction rollback works,
- state and history remain consistent,
- pagination works,
- date filters work.

### Discord

- room aliases resolve,
- `!status` uses live state,
- `!room` uses live state,
- `!usage` uses persisted kWh,
- grammar works,
- invalid input gets useful guidance.

Use a separate test database or safe mocks.

Never run destructive tests against production Supabase.

---

## 32. Build Order

1. Inspect the repository.
2. Configure NestJS and environment validation.
3. Add Prisma and Supabase connection.
4. Create schema and migrations.
5. Create idempotent seed.
6. Verify exactly 15 devices.
7. Implement shared PrismaService.
8. Implement DevicesService.
9. Implement transactions and history.
10. Implement power snapshots.
11. Implement usage and kWh.
12. Implement internal events.
13. Implement simulator.
14. Implement persisted alerts.
15. Implement REST endpoints.
16. Implement Socket.IO.
17. Implement required Discord commands.
18. Implement proactive Discord alerts.
19. Add tests.
20. Update README.
21. Create system diagram.
22. Create Wokwi/Tinkercad schematic.
23. Polish dashboard.
24. Record demo video.
25. Run final validation.

---

## 33. Evaluation Priorities

| Criterion | Weight |
|---|---:|
| Working web dashboard with real-time data | 20% |
| Working Discord bot reflecting real simulated data | 10% |
| Dashboard visuals and UX quality | 10% |
| Clear and correct system diagram | 15% |
| Sensible circuit schematic | 15% |
| Quality of demo and dummy data simulation | 15% |
| Well-structured and documented codebase and commits | 15% |

Priority guidance:

- Do not sacrifice mandatory features for database over-engineering.
- The diagram, circuit, demo, and documentation together carry major marks.
- Complete required Discord commands before optional LLM integration.
- Complete the live dashboard before building historical visualizations.

---

## 34. Validation Checklist

### Database

- [ ] Supabase connected
- [ ] exactly 15 device rows
- [ ] seed is idempotent
- [ ] state survives restart
- [ ] device history persists
- [ ] power snapshots persist
- [ ] resolved alerts persist

### Simulator

- [ ] changes one device approximately every 10 seconds
- [ ] no overlapping runs
- [ ] writes commit before events emit

### Usage

- [ ] current watts match persisted state
- [ ] room totals are correct
- [ ] today’s kWh comes from snapshots
- [ ] usage survives restart

### Realtime

- [ ] `state:snapshot`
- [ ] `device:update`
- [ ] `usage:update`
- [ ] `alert:new`
- [ ] `alert:resolved`
- [ ] no page refresh required

### Alerts

- [ ] after-hours alert triggers
- [ ] after-hours alert resolves
- [ ] room-all-on alert triggers
- [ ] room-all-on alert resolves
- [ ] duplicate active alerts prevented

### Discord

- [ ] `!status`
- [ ] `!room drawing`
- [ ] `!room work1`
- [ ] `!room work2`
- [ ] `!usage`
- [ ] optional `!alerts`
- [ ] responses match dashboard state
- [ ] proactive alerts work
- [ ] missing token does not crash backend

### Deliverables

- [ ] public repository
- [ ] complete README
- [ ] system diagram
- [ ] hardware schematic
- [ ] schematic link
- [ ] pin-mapping table
- [ ] demo video
- [ ] screenshots where useful

### Code Quality

- [ ] lint passes
- [ ] type-check passes
- [ ] tests pass
- [ ] production build passes
- [ ] `.env` ignored
- [ ] `.env.example` complete
- [ ] no secrets committed
- [ ] commit history is meaningful

---

## 35. Required Deliverables

### Public Repository

Must include:

- source code,
- Prisma schema,
- migrations,
- seed script,
- setup instructions,
- backend instructions,
- dashboard instructions,
- Discord setup instructions,
- environment variable reference,
- system diagram,
- Wokwi/Tinkercad schematic reference,
- pin-mapping table,
- screenshots where useful.

### Demo Video

Preferred maximum duration: 3 minutes.

Suggested sequence:

1. Explain the problem.
2. Show the architecture.
3. Show the live dashboard.
4. Show simulated device changes.
5. Show total and room power updates.
6. Show an alert.
7. Run Discord commands.
8. Show dashboard and Discord consistency.
9. Briefly show Supabase history.
10. Briefly show the schematic.
11. Briefly show repository structure.

---

## 36. Explicitly Out of Scope

- Real physical hardware
- Direct frontend-to-Supabase access
- Separate Discord microservice
- Multiple sources of truth
- Hardcoded bot responses
- Dashboard polling
- Manual dashboard refresh
- Mermaid as the final diagram
- AI-generated Wokwi project JSON as the only schematic work
- Unbounded history queries
- Destructive database reset without approval
- User/contact tables unrelated to the device-monitoring problem

---

## 37. Definition of Done

The project is complete only when:

- exactly 15 devices exist,
- device data changes dynamically,
- changes persist in PostgreSQL,
- the dashboard updates in real time,
- Discord reflects the same committed state,
- total power is correct,
- room power is correct,
- daily kWh is persisted and correct,
- history survives restart,
- both alert rules work,
- duplicate alerts are prevented,
- required REST endpoints work,
- required Socket.IO events work,
- required Discord commands work,
- the system diagram is complete,
- the hardware schematic is complete,
- the public repository is documented,
- the demo video is ready,
- tests pass,
- lint passes,
- type-check passes,
- production build succeeds.