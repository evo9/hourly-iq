# Architecture & Design Decisions

## The Core Problem: Invoice-Payment Mismatch

Standard billing apps link payments directly to invoices. In theory this
makes sense. In practice, freelance clients:

- Pay in multiple parts without referencing a specific invoice
- Pay late — often covering 1–2 months in a single transfer
- Sometimes go weeks without payment while invoices accumulate

Forcing a payment-to-invoice mapping means spending time on bookkeeping
guesswork instead of actual work.

## Solution: Client-Level Debt

HourlyIQ decouples payments from invoices entirely.

```
debt = SUM(client.invoices.dueAmount) - SUM(client.payments.amount)
```

Both lists are independent. An invoice records what was agreed and billed.
A payment records what was received and when. The app computes the
difference — that's the debt.

**Trade-off:** You lose the ability to say "this payment closes invoice #12".
In exchange, you gain a model that matches how freelance cash flow actually works.

## Data Model

```
clients
  ├── invoices   (what was billed)
  │     month, year, rate, hours
  │     amount = rate × hours        (computed, immutable)
  │     dueAmount                    (editable — discounts, adjustments)
  │
  └── payments   (what was received)
        clientId  (no invoiceId)
        amount, paidAt, note
```

`amount` vs `dueAmount` on invoices: `amount` is always `rate × hours`
and never changes. `dueAmount` is what you actually expect to receive —
can be lower (discount) or higher (revision). All debt calculations
use `dueAmount`.

## Frontend Architecture

Single-page app served by NestJS via `ServeStatic`. No separate frontend
server in production — one process, one port.

**No auth** — single-user, self-hosted tool. Simplicity is intentional.

**Client-side filtering** — date range filters operate on already-loaded
data without additional API calls. Given the expected data volume
(hundreds of records at most), this is appropriate.

**Split view** — invoices and payments shown side by side with independent
date filters. This directly addresses the invoice/payment timing mismatch:
you can filter invoices for Q3 and payments for Q4 simultaneously.

## Tech Choices

**SQLite over PostgreSQL** — single user, self-hosted, zero infrastructure.
The database is a single file you can back up with `cp`.

**better-sqlite3 over node-sqlite3** — synchronous API, better TypeORM
integration, actively maintained.

**@react-pdf/renderer over html2canvas/puppeteer** — programmatic PDF
generation without browser rendering. Predictable output, no headless
browser dependency, works in any environment.
