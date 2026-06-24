# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> The import above is load-bearing: this repo runs **Next.js 16.2.9 + React 19**, whose
> APIs and conventions differ from older Next.js. Before writing framework code, read the
> relevant guide under `node_modules/next/dist/docs/` (`01-app`, `03-architecture`, …) and
> heed deprecation notices.

## Project

Single-user, local-first personal finance & portfolio tracker. Manual entry for cash-flow
transactions and share counts; live daily prices for stocks are fetched from Yahoo Finance.
`spec.md` is the authoritative product spec (schema, categories, per-page requirements).

## Commands

```bash
npm run dev          # next dev (App Router)
npm run build        # next build
npm run lint         # eslint (flat config; eslint-config-next core-web-vitals + typescript)
npx tsc --noEmit     # type-check only

npx prisma db push        # apply prisma/schema.prisma to dev.db (no migration history)
npx prisma generate       # regenerate @prisma/client after schema changes
npx prisma studio         # inspect the SQLite data
```

There is no test suite. Verify changes with `npx tsc --noEmit`, `npm run lint`, and by
running the app.

## Stack notes (read before touching these areas)

- **UI components are shadcn on Base UI (`@base-ui/react`), not Radix.** `components.json`
  uses style `base-nova`. When adding components, import primitives from `@base-ui/react`;
  do not reach for `@radix-ui/*`.
- **`yahoo-finance2` is v3: the singleton API was removed.** Instantiate per module, e.g.
  `new YahooFinance({ suppressNotices: ["yahooSurvey"] })` (see `src/app/portfolio/actions.ts`).
- **Prisma is pinned to v6** (v7 requires Node ≥ 22.0.0). `prisma.config.ts` drives config
  (loads `.env` via `dotenv/config`, `engine: "classic"`, migrations under `prisma/migrations`).
- SQLite file is `prisma/dev.db`; `DATABASE_URL` lives in `.env`. The DB and `.env*` are
  gitignored.

## Architecture

- **App Router, server-first.** Pages (`src/app/{,transactions,portfolio}/page.tsx`) are
  async Server Components that read directly from Prisma. Mutations live in colocated
  `actions.ts` files marked `"use server"`.
- **Server Action conventions:**
  - Form actions take `(prevState: ActionResult, formData: FormData)` and return
    `ActionResult = { ok?: boolean; error?: string }` — designed for React's `useActionState`.
    Validation happens server-side inside the action; return `{ error }` rather than throwing.
  - Delete actions take a plain `id: string` and return `void`.
  - Every mutation calls `revalidatePath` for both its own page and `/` (the dashboard
    aggregates everything).
- **Prisma client** is a singleton from `src/lib/prisma.ts` (cached on `globalThis` in dev to
  survive HMR). Always import `prisma` from there.
- **Price fetching is best-effort and must never crash a page.** `priceFor()` returns `null`
  on any failure; `getPortfolioWithPrices()` maps that to a `$0` price with
  `priceUnavailable: true`. Adding a holding *validates* the ticker up front
  (`validateTicker` → `suggestSymbol` for "did you mean").
- **The dashboard (`/`) sets `export const dynamic = "force-dynamic"`** because it pulls live
  prices and current-month aggregates; keep it non-static.
- **Shared libs:** `src/lib/categories.ts` (canonical income/expense category lists + types —
  forms must use these), `src/lib/format.ts` (`formatCurrency`/`formatDate` via `Intl`),
  `src/lib/utils.ts` (`cn`).

## Data model (`prisma/schema.prisma`)

- `Transaction` — `type` is a string `"INCOME"` | `"EXPENSE"` (no enum); `category` is a free
  string validated against `src/lib/categories.ts` lists.
- `PortfolioItem` — `ticker` is `@unique` and stored uppercased; duplicate inserts surface
  Prisma error `P2002`, which actions translate into a friendly message.
