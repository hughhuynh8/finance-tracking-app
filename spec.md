
# Project Specification: Personal Finance & Portfolio Tracker

## 1. Project Overview
Build a single-user, local-first web application to track personal finances (income and expenses) and a stock portfolio. The app will rely on manual entry for cash-flow transactions and manual share-count entry for stocks, but will automatically fetch the latest daily closing prices for the portfolio.

## 2. Tech Stack Requirements
Claude Code, please strictly adhere to the following stack:
*   **Framework:** Next.js (App Router) using TypeScript.
*   **Styling:** Tailwind CSS.
*   **UI Components:** `shadcn/ui` (use standard components like cards, tables, dialogs, forms, inputs, selects).
*   **Database:** SQLite (local file `dev.db`).
*   **ORM:** Prisma.
*   **Stock Data:** `yahoo-finance2` (npm package) for fetching stock prices (does not require API keys).
*   **Icons:** `lucide-react`.

## 3. Database Schema (Prisma)
Please implement the following schema in `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model Transaction {
  id          String   @id @default(cuid())
  type        String   // "INCOME" or "EXPENSE"
  amount      Float
  date        DateTime @default(now())
  category    String   // e.g., "Rent", "Groceries", "Subscriptions", "Salary"
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model PortfolioItem {
  id           String   @id @default(cuid())
  ticker       String   @unique // e.g., "AAPL", "MSFT"
  shares       Float
  averagePrice Float?   // Optional: average purchase price
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

## 4. Required Categories
When creating the frontend forms for `Transaction`, use these default categories in the Select dropdown:
*   **Income Categories:** Salary, Freelance, Dividends, Refunds, Other.
*   **Expense Categories:** Rent/Mortgage, Groceries, Dining Out, Subscriptions, Utilities, Transportation, Health, Entertainment, Miscellaneous.

## 5. Core Features & UI Layout

### Page 1: Dashboard (`/`)
*   **Summary Cards:** 
    *   Total Income (Current Month)
    *   Total Expenses (Current Month)
    *   Net Cash Flow (Income - Expenses)
    *   Total Portfolio Value (Calculated dynamically)
*   **Recent Activity:** A small table showing the 5 most recent transactions.

### Page 2: Transactions (`/transactions`)
*   **Header:** "Income & Expenses".
*   **Action:** "Add Transaction" button that opens a Modal/Dialog form.
*   **Form Fields:** Type (Radio/Select), Amount (Number), Date (Date picker), Category (Select), Description (Text input).
*   **View:** A data table listing all transactions, sorted by date descending. Include a "Delete" button for each row.

### Page 3: Portfolio (`/portfolio`)
*   **Header:** "Stock Portfolio".
*   **Action:** "Add Holding" button that opens a Modal/Dialog form.
*   **Form Fields:** Ticker Symbol (Text, auto-uppercase), Number of Shares (Number), Average Price (Number, optional).
*   **Data Fetching Logic:** 
    *   On page load, fetch all `PortfolioItem` records from SQLite.
    *   Use a Next.js Server Action or API Route to iterate through the tickers and fetch the current regular market price using `yahooFinance.quote(ticker)`.
    *   Calculate Total Value = `shares * currentPrice`.
*   **View:** A data table showing: Ticker, Shares Owned, Current Price, Total Value. Include "Edit Shares" and "Delete" actions.

### Page 4: Home Loans (`/mortgage`)
*   **Header:** "Home Loans".
*   **Action:** "Add Loan" button that opens a Modal/Dialog form.
*   **Form Fields:** Loan Name (Text), Loan Amount (Number), Interest Rate (% p.a., Number), Scheduled Monthly Repayment (Number), Start Date (Date picker).
*   **Repayments:** Each loan logs individual repayments (Date, Amount) via an "Add Repayment" dialog; repayments cascade-delete with their loan.
*   **Amortization Logic (`src/lib/mortgage.ts`):**
    *   Replay logged repayments from the opening balance, accruing interest *daily* between repayments, to produce the real balance curve and current balance.
    *   Project forward from the current balance using simple monthly compounding at the scheduled repayment to estimate the payoff date, months remaining, and remaining interest.
    *   If the scheduled repayment doesn't cover the first month's interest, flag the loan as never amortizing instead of looping forever.
*   **View:** A per-loan card with a summary (current balance, est. payoff date, time remaining, interest remaining), a dependency-free SVG chart of balance over time (solid = actual, dashed = projection), and a repayments table with "Add Repayment" / "Delete" actions.

## 6. Implementation Steps for Claude Code

**Claude, please execute this project step-by-step. Stop and ask for my confirmation after completing each phase before moving to the next.**

*   **Phase 1: Project Initialization**
    *   Run `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`.
    *   Initialize `shadcn/ui` (`npx shadcn@latest init`).
    *   Install Prisma and initialize SQLite (`npx prisma init --datasource-provider sqlite`).
    *   Apply the Prisma schema provided above, run `npx prisma db push`, and generate the client.

*   **Phase 2: Layout & Navigation**
    *   Create a simple top or side navigation bar linking to `/`, `/transactions`, and `/portfolio`.
    *   Ensure the main layout uses a clean, modern UI (light/dark mode optional, keep it simple).

*   **Phase 3: Transactions CRUD**
    *   Install necessary shadcn components (table, dialog, form, input, select, button).
    *   Create Next.js Server Actions for `addTransaction` and `deleteTransaction`.
    *   Build the `/transactions` page and the "Add Transaction" modal.

*   **Phase 4: Portfolio & Stock API Integration**
    *   Install `yahoo-finance2`.
    *   Create Next.js Server Actions for `addPortfolioItem`, `deletePortfolioItem`, and `getPortfolioWithPrices`.
    *   *Crucial:* Ensure the `getPortfolioWithPrices` action gracefully handles invalid tickers by returning $0 for the price instead of crashing.
    *   Build the `/portfolio` page.

*   **Phase 5: Dashboard Construction**
    *   Build the `/` page.
    *   Aggregate data from the database for the current month's income/expenses.
    *   Fetch the portfolio total value.
    *   Display all data in summary cards.