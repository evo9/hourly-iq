# Separate Filters (Etap 16) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace one global filter with two independent filters — one in the Invoices panel header, one in the Payments panel header — each filtering only its own column.

**Architecture:** Add `MonthYearRange` type to `groupByMonth.ts`. Extract `MonthRangeFilter` component from `ClientDetail`. Move filter state to `ClientDetail` (`invoiceFilter` + `paymentFilter`), pass down to panels. InvoicesPanel also receives PDF-related props. ClientSummaryBar shows unfiltered totals, no period label.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, @react-pdf/renderer

---

### Task 1: Add MonthYearRange export to groupByMonth.ts

**Files:**
- Modify: `frontend/src/utils/groupByMonth.ts`

- [ ] **Step 1: Add the type**

In `frontend/src/utils/groupByMonth.ts`, after the `MonthYear` interface, add:

```typescript
export interface MonthYearRange { from: MonthYear | null; to: MonthYear | null; }
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/utils/groupByMonth.ts
git commit -m "feat: export MonthYearRange type from groupByMonth"
```

---

### Task 2: Create MonthRangeFilter component

**Files:**
- Create: `frontend/src/components/MonthRangeFilter.tsx`

- [ ] **Step 1: Write the component**

```tsx
// frontend/src/components/MonthRangeFilter.tsx
import { MONTHS_UA } from '../utils/format';
import type { MonthYear, MonthYearRange } from '../utils/groupByMonth';

interface MonthYearSelectProps {
  value: MonthYear | null;
  onChange: (v: MonthYear | null) => void;
  years: number[];
  label: string;
  invalid?: boolean;
}

function MonthYearSelect({ value, onChange, years, label, invalid }: MonthYearSelectProps) {
  const month = value?.month ?? '';
  const year = value?.year ?? '';
  const borderCls = invalid
    ? 'border-red-400 focus:ring-red-500'
    : 'border-gray-300 focus:ring-blue-500';

  const handleMonth = (m: string) => {
    if (!m) { onChange(null); return; }
    onChange({ month: Number(m), year: value?.year ?? new Date().getFullYear() });
  };

  const handleYear = (y: string) => {
    if (!y) { onChange(null); return; }
    onChange({ month: value?.month ?? 1, year: Number(y) });
  };

  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-sm text-gray-500">{label}</span>
      <select
        value={month}
        onChange={e => handleMonth(e.target.value)}
        className={`border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 ${borderCls}`}
      >
        <option value="">міс.</option>
        {MONTHS_UA.map((name, i) => (
          <option key={i + 1} value={String(i + 1)}>{name}</option>
        ))}
      </select>
      <select
        value={year}
        onChange={e => handleYear(e.target.value)}
        className={`border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 ${borderCls}`}
      >
        <option value="">рік</option>
        {years.map(y => (
          <option key={y} value={String(y)}>{y}</option>
        ))}
      </select>
    </span>
  );
}

export interface MonthRangeFilterProps {
  value: MonthYearRange;
  onChange: (v: MonthYearRange) => void;
  yearOptions: number[];
}

export default function MonthRangeFilter({ value, onChange, yearOptions }: MonthRangeFilterProps) {
  const isActive = value.from !== null || value.to !== null;
  const isValid = !value.from || !value.to ||
    (value.from.year * 12 + value.from.month) <= (value.to.year * 12 + value.to.month);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <MonthYearSelect
        value={value.from}
        onChange={from => onChange({ ...value, from })}
        years={yearOptions}
        label="Від:"
        invalid={!isValid && value.from !== null}
      />
      <MonthYearSelect
        value={value.to}
        onChange={to => onChange({ ...value, to })}
        years={yearOptions}
        label="До:"
        invalid={!isValid && value.to !== null}
      />
      {isActive && (
        <button
          onClick={() => onChange({ from: null, to: null })}
          className="text-sm px-2 py-1 text-gray-400 hover:text-gray-600 border border-gray-200 rounded leading-none"
          title="Скинути фільтр"
        >
          ×
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/MonthRangeFilter.tsx
git commit -m "feat: add MonthRangeFilter component"
```

---

### Task 3: Update ClientReportPdf.tsx — two independent filters

**Files:**
- Modify: `frontend/src/pdf/ClientReportPdf.tsx`

Replace `filter: Filter` with `invoiceFilter: MonthYearRange` + `paymentFilter: MonthYearRange`. Filter each data set independently. Show separate period labels in header.

- [ ] **Step 1: Replace the file contents**

```tsx
import React from 'react';
import { Document, Page, View, Text, PDFDownloadLink } from '@react-pdf/renderer';
import { styles } from './PdfStyles';
import type { Client, Invoice, Payment } from '../types';
import { MONTHS_UA, formatMoney } from '../utils/format';
import {
  groupInvoicesByMonth,
  groupPaymentsByMonth,
  invoiceInRange,
  paymentInRange,
} from '../utils/groupByMonth';
import type { MonthYearRange } from '../utils/groupByMonth';

interface Props {
  client: Client;
  invoices: Invoice[];
  payments: Payment[];
  invoiceFilter: MonthYearRange;
  paymentFilter: MonthYearRange;
}

function rangeLabel(f: MonthYearRange): string {
  const from = f.from ? `${MONTHS_UA[f.from.month - 1]} ${f.from.year}` : '...';
  const to = f.to ? `${MONTHS_UA[f.to.month - 1]} ${f.to.year}` : '...';
  return `${from} — ${to}`;
}

function ClientReportDocument({ client, invoices, payments, invoiceFilter, paymentFilter }: Props) {
  const filteredInvoices = invoices.filter(inv => invoiceInRange(inv, invoiceFilter));
  const filteredPayments = payments.filter(p => paymentInRange(p, paymentFilter));

  const totalInvoiced = filteredInvoices.reduce((s, i) => s + i.dueAmount, 0);
  const totalPaid = filteredPayments.reduce((s, p) => s + p.amount, 0);
  const debt = Math.max(0, totalInvoiced - totalPaid);

  const invoiceGroups = groupInvoicesByMonth(filteredInvoices);
  const paymentGroups = groupPaymentsByMonth(filteredPayments);

  const hasInvoiceFilter = invoiceFilter.from !== null || invoiceFilter.to !== null;
  const hasPaymentFilter = paymentFilter.from !== null || paymentFilter.to !== null;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.clientName}>{client.name}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Виставлено</Text>
              <Text style={styles.summaryValue}>{formatMoney(totalInvoiced, client.currency)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Отримано</Text>
              <Text style={styles.summaryValue}>{formatMoney(totalPaid, client.currency)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Борг</Text>
              <Text style={debt > 0 ? styles.summaryValueRed : styles.summaryValue}>
                {formatMoney(debt, client.currency)}
              </Text>
            </View>
          </View>
          {hasInvoiceFilter ? (
            <Text style={styles.periodLabel}>Інвойси: {rangeLabel(invoiceFilter)}</Text>
          ) : null}
          {hasPaymentFilter ? (
            <Text style={styles.periodLabel}>Виплати: {rangeLabel(paymentFilter)}</Text>
          ) : null}
        </View>

        <View style={styles.columns}>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>Інвойси</Text>
            {invoiceGroups.length === 0 ? (
              <Text style={styles.emptyText}>Немає інвойсів</Text>
            ) : null}
            {invoiceGroups.map(group => (
              <View key={group.key} style={styles.monthGroup}>
                <View style={styles.monthHeader}>
                  <Text style={styles.monthLabel}>{group.label}</Text>
                  <Text style={styles.monthTotal}>{formatMoney(group.total, client.currency)}</Text>
                </View>
                {group.items.map(inv => {
                  const hasDiscount = inv.amount !== inv.dueAmount;
                  return (
                    <View key={inv.id} style={styles.invoiceRow}>
                      <Text style={styles.invoiceCalc}>
                        {inv.hours}h × {inv.rate} {client.currency} = {formatMoney(inv.amount, client.currency)}
                      </Text>
                      {hasDiscount ? (
                        <Text style={styles.invoiceDue}>До сплати: {formatMoney(inv.dueAmount, client.currency)}</Text>
                      ) : null}
                      {inv.description ? (
                        <Text style={styles.invoiceDesc}>{inv.description}</Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={styles.column}>
            <Text style={styles.columnTitle}>Виплати</Text>
            {paymentGroups.length === 0 ? (
              <Text style={styles.emptyText}>Немає виплат</Text>
            ) : null}
            {paymentGroups.map(group => (
              <View key={group.key} style={styles.monthGroup}>
                <View style={styles.monthHeader}>
                  <Text style={styles.monthLabel}>{group.label}</Text>
                  <Text style={styles.monthTotal}>
                    {formatMoney(group.total, client.currency)}
                    {group.items.length > 1 ? ` · ${group.items.length} пл.` : ''}
                  </Text>
                </View>
                {group.items.map(p => (
                  <React.Fragment key={p.id}>
                    <View style={styles.paymentRow}>
                      <Text style={styles.paymentDate}>{p.paidAt}</Text>
                      <Text style={styles.paymentAmount}>{formatMoney(p.amount, client.currency)}</Text>
                    </View>
                    {p.note ? <Text style={styles.paymentNote}>{p.note}</Text> : null}
                  </React.Fragment>
                ))}
              </View>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  );
}

export function PdfDownloadButton({ client, invoices, payments, invoiceFilter, paymentFilter }: Props) {
  const hasFilter = invoiceFilter.from || invoiceFilter.to || paymentFilter.from || paymentFilter.to;
  const fromStr = invoiceFilter.from
    ? `${invoiceFilter.from.year}-${String(invoiceFilter.from.month).padStart(2, '0')}`
    : 'all';
  const toStr = invoiceFilter.to
    ? `${invoiceFilter.to.year}-${String(invoiceFilter.to.month).padStart(2, '0')}`
    : 'all';
  const filename = hasFilter ? `${client.name}-${fromStr}_${toStr}.pdf` : `${client.name}-all.pdf`;

  return (
    <PDFDownloadLink
      document={
        <ClientReportDocument
          client={client}
          invoices={invoices}
          payments={payments}
          invoiceFilter={invoiceFilter}
          paymentFilter={paymentFilter}
        />
      }
      fileName={filename}
      className="ml-auto text-sm px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors no-underline inline-flex items-center"
    >
      {({ loading }) => (loading ? 'Генерація...' : '↓ PDF')}
    </PDFDownloadLink>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pdf/ClientReportPdf.tsx
git commit -m "feat: PDF uses separate invoiceFilter and paymentFilter"
```

---

### Task 4: Update InvoicesPanel.tsx — add filter + PDF to header

**Files:**
- Modify: `frontend/src/components/InvoicesPanel.tsx`

New props: `filter`, `onFilterChange`, `client`, `payments`, `paymentFilter` (for PDF).  
Internal filtering replaces pre-filtered data from parent.  
yearOptions derived from `invoices`.

- [ ] **Step 1: Replace InvoicesPanel.tsx**

```tsx
import { useState } from 'react';
import toast from 'react-hot-toast';
import { invoicesApi } from '../api/invoices';
import type { Client, Invoice, Payment } from '../types';
import Modal from './Modal';
import { MONTHS_UA, formatMoney } from '../utils/format';
import { groupInvoicesByMonth, invoiceInRange } from '../utils/groupByMonth';
import type { MonthYearRange } from '../utils/groupByMonth';
import MonthRangeFilter from './MonthRangeFilter';
import { PdfDownloadButton } from '../pdf/ClientReportPdf';

interface InvoiceForm {
  month: string;
  year: string;
  rate: string;
  hours: string;
  dueAmount: string;
  dueAmountManual: boolean;
  description: string;
}

const curDate = new Date();
const emptyForm = (defaultRate?: number | null): InvoiceForm => ({
  month: String(curDate.getMonth() + 1),
  year: String(curDate.getFullYear()),
  rate: defaultRate != null ? String(defaultRate) : '',
  hours: '',
  dueAmount: '',
  dueAmountManual: false,
  description: '',
});

interface Props {
  invoices: Invoice[];
  currency: string;
  clientId: number;
  defaultRate: number | null;
  onMutate: () => void;
  filter: MonthYearRange;
  onFilterChange: (v: MonthYearRange) => void;
  client: Client;
  payments: Payment[];
  paymentFilter: MonthYearRange;
}

export default function InvoicesPanel({
  invoices,
  currency,
  clientId,
  defaultRate,
  onMutate,
  filter,
  onFilterChange,
  client,
  payments,
  paymentFilter,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [form, setForm] = useState<InvoiceForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const isFilterValid = !filter.from || !filter.to ||
    (filter.from.year * 12 + filter.from.month) <= (filter.to.year * 12 + filter.to.month);

  const displayedInvoices = (filter.from !== null || filter.to !== null) && isFilterValid
    ? invoices.filter(inv => invoiceInRange(inv, filter))
    : invoices;

  const groups = groupInvoicesByMonth(displayedInvoices);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const invoiceYears = [...new Set(invoices.map(inv => inv.year))].sort();
  const currentYear = new Date().getFullYear();
  const yearOptions = invoiceYears.length > 0 ? invoiceYears : [currentYear];

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(defaultRate));
    setModalOpen(true);
  };

  const openEdit = (inv: Invoice) => {
    setEditing(inv);
    setForm({
      month: String(inv.month),
      year: String(inv.year),
      rate: String(inv.rate),
      hours: String(inv.hours),
      dueAmount: String(inv.dueAmount),
      dueAmountManual: inv.dueAmount !== inv.amount,
      description: inv.description ?? '',
    });
    setModalOpen(true);
  };

  const handleDelete = async (inv: Invoice) => {
    if (!window.confirm(`Видалити інвойс ${MONTHS_UA[inv.month - 1]} ${inv.year}?`)) return;
    try {
      await invoicesApi.remove(inv.id);
      toast.success('Інвойс видалено');
      onMutate();
    } catch {
      toast.error('Помилка при видаленні');
    }
  };

  const computedAmount = (Number(form.rate) || 0) * (Number(form.hours) || 0);

  const handleRateChange = (val: string) => {
    const amt = (Number(val) || 0) * (Number(form.hours) || 0);
    setForm(f => ({ ...f, rate: val, dueAmount: f.dueAmountManual ? f.dueAmount : String(amt) }));
  };

  const handleHoursChange = (val: string) => {
    const amt = (Number(form.rate) || 0) * (Number(val) || 0);
    setForm(f => ({ ...f, hours: val, dueAmount: f.dueAmountManual ? f.dueAmount : String(amt) }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        clientId,
        month: Number(form.month),
        year: Number(form.year),
        rate: Number(form.rate),
        hours: Number(form.hours),
        dueAmount: form.dueAmountManual ? Number(form.dueAmount) : undefined,
        description: form.description.trim() || undefined,
      };
      if (editing) {
        await invoicesApi.update(editing.id, data);
      } else {
        await invoicesApi.create(data);
      }
      setModalOpen(false);
      toast.success(editing ? 'Інвойс оновлено' : 'Інвойс створено');
      onMutate();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(axiosErr.response?.data?.message ?? 'Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-800 shrink-0">Інвойси</h2>
        <div className="flex flex-wrap items-center gap-2">
          <MonthRangeFilter value={filter} onChange={onFilterChange} yearOptions={yearOptions} />
          <PdfDownloadButton
            client={client}
            invoices={invoices}
            payments={payments}
            invoiceFilter={filter}
            paymentFilter={paymentFilter}
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Додати інвойс
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="text-gray-400 text-sm">Інвойсів ще немає — додайте перший</p>
      ) : (
        <div className="space-y-3">
          {groups.map(group => {
            const isOpen = expanded.has(group.key);
            return (
              <div key={group.key} className="month-group bg-white rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => toggle(group.key)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <span className="text-sm font-semibold text-gray-700">{group.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{formatMoney(group.total, currency)}</span>
                    <span className={`text-gray-400 text-xs transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                  </div>
                </button>
                <div className={`collapsible-content overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="divide-y divide-gray-50">
                    {group.items.map(inv => {
                      const hasDiscount = inv.amount !== inv.dueAmount;
                      return (
                        <div key={inv.id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="text-sm text-gray-700">
                                {inv.hours}h × {inv.rate} {currency} = {formatMoney(inv.amount, currency)}
                              </div>
                              {hasDiscount && (
                                <div className="text-sm font-medium text-gray-900">
                                  До сплати: {formatMoney(inv.dueAmount, currency)}
                                </div>
                              )}
                              {inv.description && (
                                <div className="text-xs text-gray-400 italic">«{inv.description}»</div>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => openEdit(inv)}
                                className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
                              >
                                Ред.
                              </button>
                              <button
                                onClick={() => handleDelete(inv)}
                                className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                Вид.
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Редагувати інвойс' : 'Новий інвойс'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Місяць *</label>
              <select
                value={form.month}
                onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MONTHS_UA.map((name, i) => (
                  <option key={i + 1} value={String(i + 1)}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Рік *</label>
              <input
                type="number"
                value={form.year}
                onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                min="2000"
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Рейт *</label>
              <input
                type="number"
                value={form.rate}
                onChange={e => handleRateChange(e.target.value)}
                min="0"
                step="0.01"
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Годин *</label>
              <input
                type="number"
                value={form.hours}
                onChange={e => handleHoursChange(e.target.value)}
                min="0"
                step="0.5"
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Сума (авто)</label>
              <input
                type="number"
                value={computedAmount}
                readOnly
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">До сплати</label>
              <input
                type="number"
                value={form.dueAmount}
                onChange={e => setForm(f => ({ ...f, dueAmount: e.target.value, dueAmountManual: true }))}
                min="0"
                step="0.01"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Опис</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Збереження...' : 'Зберегти'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/InvoicesPanel.tsx
git commit -m "feat: add filter and PDF button to InvoicesPanel header"
```

---

### Task 5: Update PaymentsPanel.tsx — add filter to header

**Files:**
- Modify: `frontend/src/components/PaymentsPanel.tsx`

New props: `filter`, `onFilterChange`. Internal filtering. yearOptions from payments data.

- [ ] **Step 1: Replace PaymentsPanel.tsx**

```tsx
import { useState } from 'react';
import toast from 'react-hot-toast';
import { paymentsApi } from '../api/payments';
import type { Payment } from '../types';
import Modal from './Modal';
import { formatMoney } from '../utils/format';
import { groupPaymentsByMonth, paymentInRange } from '../utils/groupByMonth';
import type { MonthYearRange } from '../utils/groupByMonth';
import MonthRangeFilter from './MonthRangeFilter';

interface PaymentForm {
  paidAt: string;
  amount: string;
  note: string;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

interface Props {
  payments: Payment[];
  currency: string;
  clientId: number;
  currentDebt: number;
  onMutate: () => void;
  filter: MonthYearRange;
  onFilterChange: (v: MonthYearRange) => void;
}

export default function PaymentsPanel({
  payments,
  currency,
  clientId,
  currentDebt,
  onMutate,
  filter,
  onFilterChange,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [form, setForm] = useState<PaymentForm>({ paidAt: todayStr(), amount: '', note: '' });
  const [saving, setSaving] = useState(false);

  const isFilterValid = !filter.from || !filter.to ||
    (filter.from.year * 12 + filter.from.month) <= (filter.to.year * 12 + filter.to.month);

  const displayedPayments = (filter.from !== null || filter.to !== null) && isFilterValid
    ? payments.filter(p => paymentInRange(p, filter))
    : payments;

  const groups = groupPaymentsByMonth(displayedPayments);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const paymentYears = [...new Set(payments.map(p => Number(p.paidAt.slice(0, 4))))].sort();
  const currentYear = new Date().getFullYear();
  const yearOptions = paymentYears.length > 0 ? paymentYears : [currentYear];

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ paidAt: todayStr(), amount: currentDebt > 0 ? String(currentDebt) : '', note: '' });
    setModalOpen(true);
  };

  const openEdit = (p: Payment) => {
    setEditing(p);
    setForm({ paidAt: p.paidAt, amount: String(p.amount), note: p.note ?? '' });
    setModalOpen(true);
  };

  const handleDelete = async (p: Payment) => {
    if (!window.confirm('Видалити виплату?')) return;
    try {
      await paymentsApi.remove(p.id);
      toast.success('Виплату видалено');
      onMutate();
    } catch {
      toast.error('Помилка при видаленні');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        clientId,
        amount: Number(form.amount),
        paidAt: form.paidAt,
        note: form.note.trim() || undefined,
      };
      if (editing) {
        await paymentsApi.update(editing.id, data);
      } else {
        await paymentsApi.create(data);
      }
      setModalOpen(false);
      toast.success(editing ? 'Виплату оновлено' : 'Виплату записано');
      onMutate();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(axiosErr.response?.data?.message ?? 'Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-800 shrink-0">Виплати</h2>
        <MonthRangeFilter value={filter} onChange={onFilterChange} yearOptions={yearOptions} />
      </div>
      <div className="flex items-center justify-between">
        <button
          onClick={openCreate}
          className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700"
        >
          + Додати виплату
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="text-gray-400 text-sm">Виплат ще не було</p>
      ) : (
        <div className="space-y-3">
          {groups.map(group => {
            const isOpen = expanded.has(group.key);
            return (
              <div key={group.key} className="month-group bg-white rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => toggle(group.key)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <span className="text-sm font-semibold text-gray-700">{group.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{formatMoney(group.total, currency)}</span>
                    <span className="text-xs text-gray-400">· {group.items.length} пл.</span>
                    <span className={`text-gray-400 text-xs transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                  </div>
                </button>
                <div className={`collapsible-content overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="divide-y divide-gray-50">
                    {group.items.map(p => (
                      <div
                        key={p.id}
                        onClick={() => openEdit(p)}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="text-sm">
                          <span className="text-gray-600">{p.paidAt}</span>
                          {p.note && (
                            <span className="ml-2 text-xs text-gray-400">«{p.note}»</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-medium text-gray-900">{formatMoney(p.amount, currency)}</span>
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(p); }}
                            className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            Вид.
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Редагувати виплату' : 'Нова виплата'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дата *</label>
            <input
              type="date"
              value={form.paidAt}
              onChange={e => setForm(f => ({ ...f, paidAt: e.target.value }))}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Сума *
              {currentDebt > 0 && !editing && (
                <span className="ml-1.5 text-xs font-normal text-gray-400">
                  (борг: {formatMoney(currentDebt, currency)})
                </span>
              )}
            </label>
            <input
              type="number"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              min="0"
              step="0.01"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Нотатка</label>
            <input
              type="text"
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Збереження...' : 'Зберегти виплату'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/PaymentsPanel.tsx
git commit -m "feat: add filter to PaymentsPanel header"
```

---

### Task 6: Update ClientDetail.tsx — two filters, no global filter UI

**Files:**
- Modify: `frontend/src/pages/ClientDetail.tsx`

Remove global `filter` state + UI row. Add `invoiceFilter` + `paymentFilter` states.  
Remove `MonthYearSelect` component (moved to `MonthRangeFilter.tsx`).  
`ClientSummaryBar` gets raw (unfiltered) invoices/payments — remove period label.  
Pass new filter props to InvoicesPanel and PaymentsPanel.  
`currentDebt` recalculated from raw data (always reflects full picture).

- [ ] **Step 1: Replace ClientDetail.tsx**

```tsx
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { clientsApi } from '../api/clients';
import { invoicesApi } from '../api/invoices';
import { paymentsApi } from '../api/payments';
import type { Client, Invoice, Payment } from '../types';
import { formatMoney } from '../utils/format';
import type { MonthYearRange } from '../utils/groupByMonth';
import InvoicesPanel from '../components/InvoicesPanel';
import PaymentsPanel from '../components/PaymentsPanel';
import { ClientFormModal, clientToForm } from './Clients';
import type { ClientForm } from './Clients';

// ─── Summary bar ──────────────────────────────────────────────────────────────

interface SummaryBarProps {
  client: Client;
  invoices: Invoice[];
  payments: Payment[];
}

function ClientSummaryBar({ client, invoices, payments }: SummaryBarProps) {
  const totalInvoiced = invoices.reduce((s, inv) => s + inv.dueAmount, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const debt = Math.max(0, totalInvoiced - totalPaid);
  const currency = client.currency;

  return (
    <div className="client-summary-bar bg-white rounded-lg border border-gray-200 px-5 py-3 text-sm">
      <div className="flex flex-wrap gap-x-8 gap-y-1">
        <span className="text-gray-500">
          Виставлено:{' '}
          <span className="font-semibold text-gray-900">{formatMoney(totalInvoiced, currency)}</span>
        </span>
        <span className="text-gray-500">
          Отримано:{' '}
          <span className="font-semibold text-gray-900">{formatMoney(totalPaid, currency)}</span>
        </span>
        <span className="text-gray-500">
          Борг:{' '}
          {debt > 0 ? (
            <span className="font-semibold text-red-600">{formatMoney(debt, currency)}</span>
          ) : (
            <span className="font-semibold text-green-600">Розрахований ✓</span>
          )}
        </span>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const [tab, setTab] = useState<'invoices' | 'payments'>('invoices');

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<ClientForm>({ name: '', currency: 'USD', defaultRate: '', notes: '' });
  const [savingClient, setSavingClient] = useState(false);

  const [invoiceFilter, setInvoiceFilter] = useState<MonthYearRange>({ from: null, to: null });
  const [paymentFilter, setPaymentFilter] = useState<MonthYearRange>({ from: null, to: null });

  const refetch = useCallback(() => setVersion(v => v + 1), []);

  useEffect(() => {
    if (!id) return;
    const numId = Number(id);
    setLoading(true);
    setError(null);

    Promise.all([
      clientsApi.getOne(numId),
      invoicesApi.getAll(numId),
      paymentsApi.getAll(numId),
    ])
      .then(([c, invs, pays]) => {
        setClient(c);
        setInvoices(invs);
        setPayments(pays);
      })
      .catch(() => setError('Помилка завантаження'))
      .finally(() => setLoading(false));
  }, [id, version]);

  if (loading) return <p className="text-gray-500">Завантаження...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!client) return null;

  const currentDebt = Math.max(
    0,
    invoices.reduce((s, inv) => s + inv.dueAmount, 0) -
    payments.reduce((s, p) => s + p.amount, 0),
  );

  const openEditClient = () => {
    setEditForm(clientToForm(client));
    setEditModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingClient(true);
    try {
      await clientsApi.update(client.id, {
        name: editForm.name.trim(),
        currency: editForm.currency,
        ...(editForm.defaultRate ? { defaultRate: Number(editForm.defaultRate) } : { defaultRate: null }),
        notes: editForm.notes.trim() || null,
      });
      setEditModalOpen(false);
      toast.success('Клієнта оновлено');
      refetch();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(axiosErr.response?.data?.message ?? 'Помилка збереження');
    } finally {
      setSavingClient(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-500 hover:text-gray-700 mb-1 flex items-center gap-1"
          >
            ← Назад
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {client.currency}
            {client.defaultRate != null ? ` · ${client.defaultRate}/год` : ''}
          </p>
        </div>
        <button
          onClick={openEditClient}
          className="mt-6 text-sm px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Редагувати клієнта
        </button>
      </div>

      {/* ── Summary bar (unfiltered totals) ── */}
      <ClientSummaryBar client={client} invoices={invoices} payments={payments} />

      {/* ── Desktop: split view ── */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-6 md:items-start split-view">
        <InvoicesPanel
          invoices={invoices}
          currency={client.currency}
          clientId={client.id}
          defaultRate={client.defaultRate}
          onMutate={refetch}
          filter={invoiceFilter}
          onFilterChange={setInvoiceFilter}
          client={client}
          payments={payments}
          paymentFilter={paymentFilter}
        />
        <PaymentsPanel
          payments={payments}
          currency={client.currency}
          clientId={client.id}
          currentDebt={currentDebt}
          onMutate={refetch}
          filter={paymentFilter}
          onFilterChange={setPaymentFilter}
        />
      </div>

      {/* ── Mobile: tabs ── */}
      <div className="md:hidden">
        <div className="flex border-b border-gray-200 mb-4">
          <button
            onClick={() => setTab('invoices')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === 'invoices'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Інвойси
          </button>
          <button
            onClick={() => setTab('payments')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === 'payments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Виплати
          </button>
        </div>

        {tab === 'invoices' ? (
          <InvoicesPanel
            invoices={invoices}
            currency={client.currency}
            clientId={client.id}
            defaultRate={client.defaultRate}
            onMutate={refetch}
            filter={invoiceFilter}
            onFilterChange={setInvoiceFilter}
            client={client}
            payments={payments}
            paymentFilter={paymentFilter}
          />
        ) : (
          <PaymentsPanel
            payments={payments}
            currency={client.currency}
            clientId={client.id}
            currentDebt={currentDebt}
            onMutate={refetch}
            filter={paymentFilter}
            onFilterChange={setPaymentFilter}
          />
        )}
      </div>

      {/* ── Client edit modal ── */}
      <ClientFormModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        editing={client}
        form={editForm}
        setForm={setEditForm}
        onSave={handleSaveClient}
        saving={savingClient}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/ClientDetail.tsx
git commit -m "feat: separate invoice and payment filters in ClientDetail"
```

---

## Spec Coverage Check

- [x] Filters in each panel header separately — InvoicesPanel header + PaymentsPanel header
- [x] Invoice filter doesn't affect payments and vice versa — independent states + filtering
- [x] ClientSummaryBar shows unfiltered totals — no filter params passed to it
- [x] [×] resets only its column filter — MonthRangeFilter's reset button calls `onChange({from:null,to:null})`
- [x] PDF uses both filters independently — `invoiceFilter` + `paymentFilter` params in PdfDownloadButton
- [x] PDF header has separate lines for each filter range — `hasInvoiceFilter`/`hasPaymentFilter` conditions
- [x] MonthRangeFilter — separate component used in both panels
- [x] yearOptions from real column data — invoiceYears from invoices, paymentYears from payments
