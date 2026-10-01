# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on localhost:8080
npm run build        # Production build
npm run build:dev    # Production bundle in development mode
npm run lint         # Run ESLint
npm run test         # Run tests once (Vitest)
npm run test:watch   # Run tests in watch mode
npm run preview      # Preview production build
```

## Architecture Overview

**FinCrisS** is a real-time financial crime detection and investigation platform built with React 18 + TypeScript + Vite. It serves analysts, investigators, compliance officers, and admins working with AML alerts, investigation cases, and Suspicious Transaction Reports (STRs).

### Stack

- **UI**: React 18, Tailwind CSS, shadcn/ui (Radix UI primitives), Lucide icons, Recharts
- **Data fetching**: TanStack Query v5 (React Query) — all server state goes through custom hooks
- **API client**: Axios with JWT bearer token injection and automatic refresh-on-401 interceptors
- **Routing**: React Router v6 with a `ProtectedRoute` HOC
- **Auth state**: React Context (`AuthContext`) — stores user, token, isAuthenticated
- **Forms**: React Hook Form + Zod
- **Environment**: `VITE_API_URL` in `.env` points to the backend (`https://api.fincriss.com`)

### Layer Structure

```
src/
├── pages/          # One file per route
├── components/     # Domain-grouped UI components (admin, agent, workbench, str, customer360, etc.)
│   └── ui/         # shadcn/ui primitives — don't modify directly
├── services/       # All API calls (auth, alerts, cases, audit, dashboard, rules, user-management)
├── hooks/          # React Query wrappers over services (useAlerts, useCase, useRules, etc.)
├── contexts/       # AuthContext — only global React context
├── types/          # Domain TypeScript types (index.ts)
├── constants/      # Business logic enumerations (priority categories, queue types)
├── lib/            # api-client.ts (Axios instance), formatters
└── data/           # Static/mock data for development fallback
```

### Data Flow Pattern

`Page → custom hook (hooks/) → service (services/) → api-client.ts (Axios)`

Services handle API response normalization (snake_case → camelCase, paginated `{ items }` vs plain array). Hooks wrap services with React Query for caching, mutations, and invalidation.

### Routing

All routes under `/` except `/login` are protected. Role-based nav is driven by `useAuth().user.role` (`analyst | investigator | principal_officer | compliance | super_admin`).

Key routes: `/dashboard`, `/alerts/workbench`, `/alerts/:alertId`, `/cases`, `/cases/:caseId`, `/audit`, `/ml-status` (Model Governance; `/mlops` and `/model-tuning` redirect here), `/workforce`, `/settings`.

### TypeScript Notes

- Path alias: `@/` → `src/`
- TypeScript is configured with `noImplicitAny: false` and `strictNullChecks: false` — do not tighten these without a migration plan
- `skipLibCheck: true` is set
