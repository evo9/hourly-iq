# CLAUDE.md — HourlyIQ

## Назва проекту
**HourlyIQ** — трекер взаєморозрахунків для фрилансера. Облік інвойсів, виплат та боргів по заказчиках.

---

## Технічний стек

| Шар | Технологія |
|-----|-----------|
| Backend | NestJS 10, TypeScript |
| Database | SQLite via `better-sqlite3` + TypeORM |
| Frontend | React 18 + Vite, TypeScript |
| UI | Tailwind CSS |
| Serving | `@nestjs/serve-static` (фронт роздається NestJS) |

**Авторизація відсутня** — single-user додаток.

---

## Структура проекту

```
hourlyiq/
├── CLAUDE.md
├── package.json               # NestJS backend
├── tsconfig.json
├── nest-cli.json
├── data/                      # SQLite файл (gitignore)
│   └── hourlyiq.db
├── src/                       # NestJS source
│   ├── main.ts
│   ├── app.module.ts
│   ├── clients/
│   ├── invoices/
│   ├── payments/
│   └── dashboard/
├── frontend/                  # React + Vite
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/               # axios-функції для кожного ресурсу
│       ├── components/        # спільні компоненти (Modal, Badge, etc.)
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── Clients.tsx
│       │   └── ClientDetail.tsx
│       └── types/             # shared TypeScript інтерфейси
└── tasks/                     # поетапні завдання для Claude Code
    ├── 01-project-init.md
    ├── 02-database-entities.md
    ├── 03-backend-api.md
    ├── 04-dashboard-service.md
    ├── 05-frontend-scaffold.md
    ├── 06-frontend-pages.md
    └── 07-polish-and-dx.md
```

---

## Сутності БД

### `clients`
| Поле | Тип | Опис |
|------|-----|------|
| id | INTEGER PK | |
| name | TEXT UNIQUE | Назва заказчика |
| currency | TEXT | USD / EUR / UAH (default USD) |
| defaultRate | REAL | Типовий рейт (підставляється в форму) |
| notes | TEXT | Довільна нотатка |
| createdAt | DATETIME | |

### `invoices`
| Поле | Тип | Опис                             |
|------|-----|----------------------------------|
| id | INTEGER PK |                                  |
| clientId | INTEGER FK | → clients                        |
| month | INTEGER | 1–12                             |
| year | INTEGER |                                  |
| rate | REAL | Рейт за годину                   |
| hours | REAL | Кількість годин                  |
| amount | REAL | rate × hours (авто)              |
| dueAmount | REAL | До сплати (можна змінити вручну) |
| description | TEXT | Опис/коментар                    |
| status | TEXT | pending / partial / paid (авто)  |
| createdAt | DATETIME |                                  |

### `payments`
| Поле | Тип | Опис |
|------|-----|------|
| id | INTEGER PK | |
| invoiceId | INTEGER FK | → invoices |
| clientId | INTEGER FK | → clients |
| amount | REAL | |
| paidAt | TEXT | ISO date 'YYYY-MM-DD' |
| note | TEXT | Довільна нотатка |
| createdAt | DATETIME | |

---

## REST API

```
GET    /api/clients
POST   /api/clients
PUT    /api/clients/:id
DELETE /api/clients/:id

GET    /api/invoices?clientId=
POST   /api/invoices
PUT    /api/invoices/:id
DELETE /api/invoices/:id

GET    /api/payments?invoiceId=
POST   /api/payments
PUT    /api/payments/:id
DELETE /api/payments/:id

GET    /api/dashboard
```

---

## Бізнес-логіка

### Авто-статус інвойсу
Після кожної операції create/update/delete виплати викликається `InvoicesService.recalcStatus(invoiceId)`:
- `paidAmount === 0` → `pending`
- `0 < paidAmount < dueAmount` → `partial`
- `paidAmount >= dueAmount` → `paid`

### Cascade delete
`Client` → cascade delete `Invoice` → cascade delete `Payment`

### `amount` vs `dueAmount`
- `amount` = `rate × hours` — розраховується автоматично, незмінне
- `dueAmount` — заповнюється з `amount`, але може бути змінено вручну (знижка, коригування)

---

## Команди розробки

```bash
# Backend
npm install
npm run start:dev          # порт 3000

# Frontend (окремий термінал)
cd frontend
npm install
npm run dev                # порт 5173 (proxy → 3000)

# Production build
npm run build:frontend     # збирає фронт у frontend/dist
npm run build              # збирає NestJS
npm run start              # роздає і API, і фронт на порту 3000
```

---

## Важливі конвенції

- Всі грошові значення зберігаються як REAL в SQLite, округлення до 2 знаків на рівні сервісу
- Дата виплати зберігається як TEXT `'YYYY-MM-DD'` (SQLite не має DATE типу)
- Frontend звертається до `/api/*` — в dev режимі Vite проксує на `localhost:3000`
- Фронтенд НЕ містить бізнес-логіки — тільки відображення та виклики API
- Компоненти пишуться як функціональні з хуками, без class components


## Особливості середовища

### macOS 16 beta (Darwin 25.3) — native addons
`better-sqlite3` потребує спеціального прапора при встановленні:
```bash
CXXFLAGS="-I/Library/Developer/CommandLineTools/SDKs/MacOSX26.2.sdk/usr/include/c++/v1" npm install
```
Або один раз прописати у `.npmrc` проекту щоб не вводити щоразу.
