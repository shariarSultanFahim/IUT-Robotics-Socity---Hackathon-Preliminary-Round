# Office Device Monitor — Dashboard

Next.js (App Router) frontend for the Office Device Monitor. It renders a live,
role-aware operational dashboard fed entirely by the NestJS backend (REST for
initial loads, Socket.IO for live updates). It never talks to Supabase directly.

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn-styled UI ·
`next-themes` · TanStack Query · Axios · `socket.io-client` · Recharts ·
`lucide-react`.

## Prerequisites

- Node.js 20+
- The backend running and reachable (default `http://localhost:3001`)
- A seeded ADMIN and/or VIEWER user (see backend `SEED_*` env + `prisma:seed`)

## Setup

```bash
cd dashboard
cp .env.example .env.local
npm install
npm run dev            # http://localhost:3000
```

Environment variables (build-time, `NEXT_PUBLIC_*`):

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend base URL (REST) |
| `NEXT_PUBLIC_SOCKET_URL` | falls back to `NEXT_PUBLIC_API_URL` | Socket.IO URL |

> The backend must allow this origin: set `DASHBOARD_ORIGIN=http://localhost:3000`
> in the backend `.env` (CORS runs with credentials for the refresh cookie).

## Scripts

```bash
npm run dev         # dev server
npm run build       # production build
npm run start       # serve the production build
npm run lint        # next lint
npm run typecheck   # tsc --noEmit
```

## Routes

```
src/app/
├── (public)/login/page.tsx     # email/password, show-hide, validation, dark mode
└── (private)/                   # protected — redirects to /login until auth resolves
    ├── layout.tsx               # sidebar + topbar + mobile sheet
    ├── dashboard/page.tsx       # summary cards, office overview, power chart, alerts, activity
    └── profile/page.tsx         # account details + role + logout
```

## Authentication flow

- **Access token in memory only** (never `localStorage`); the refresh token lives
  in a backend HttpOnly cookie.
- **Refresh on load:** `AuthProvider` calls `POST /api/auth/refresh` once on
  mount to restore a session (private routes show a loader — never flash
  protected content — until this resolves).
- **Axios interceptor:** attaches `Authorization: Bearer`; on a single `401` it
  performs one refresh (single-flight — concurrent 401s share one refresh call),
  retries the original request once, and on failure clears auth and redirects to
  `/login`. All requests use `withCredentials: true`.
- **Logout** revokes the session server-side and clears local state.
- **Role-aware UI:** VIEWERs don't see device-toggle controls; ADMINs can toggle
  devices (the backend still enforces this — the UI is convenience only).

## Live sync (one socket, no polling)

`SocketProvider` opens **one** Socket.IO connection after authentication,
sending the access token in the handshake (`auth: { token }`) and refreshing it
on reconnect. It maps events to TanStack Query cache invalidation:

| Socket event | Effect |
|---|---|
| `device:update` | invalidate `devices`, `usage` |
| `usage:update` | invalidate `usage` |
| `alert:new` / `alert:resolved` | invalidate `alerts` |
| `history:invalidate` | invalidate exactly the `resources` named in the payload |

Query keys: `["devices"]`, `["usage"]`, `["alerts"]`,
`["device-history", filters]`, `["power-history", filters]`,
`["alert-history", filters]`. There is **no polling**.

## Date & time

One reusable formatter (`src/lib/format.ts`) renders all UI timestamps in
`Asia/Dhaka`, locale `en-BD`, 12-hour with uppercase AM/PM (e.g.
`03 Jul 2026, 10:30 PM`) using `Intl.DateTimeFormat` — no manual offset. API
payloads remain UTC ISO.

## Notes

- Built with self-contained shadcn-styled components (Tailwind + CSS variables)
  for light/dark theming; no network-dependent component CLI is required.
- Production build is fully static-optimized for the client shell; all data is
  fetched at runtime from the authenticated backend.
