# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod, drizzle-zod
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)
- **Frontend**: React + Vite (artifacts/cashbook)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── cashbook/           # React + Vite frontend (main app, served at /)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/
└── package.json
```

## Application: Cashbook Manager

A multi-cashbook ledger app for tracking business Cash In/Out transactions.

### Features
- Multi-cashbook management (sidebar to switch between cashbooks)
- Transaction logging: Cash In (emerald green) / Cash Out (rose red)
- Live running balance calculation
- Transactions grouped by date
- Search/filter by particular
- Dark mode toggle
- PDF export of ledger with jspdf
- Mobile-optimized layout
- Toast notifications on save

### Database Schema
- `cashbooks` table: id, name, description, createdAt, updatedAt
- `transactions` table: id, cashbookId, type (cash_in/cash_out), amount, particular, date, createdAt

### API Routes (all under /api)
- GET/POST /cashbooks
- GET/PUT/DELETE /cashbooks/:id
- GET/POST /cashbooks/:id/transactions
- DELETE /cashbooks/:id/transactions/:txId

## TypeScript & Composite Projects

Every lib package extends tsconfig.base.json with composite: true.

- Run `pnpm run typecheck` from root for full typecheck
- Run `pnpm --filter @workspace/db run push` for schema migrations
- Run `pnpm --filter @workspace/api-spec run codegen` after OpenAPI changes
