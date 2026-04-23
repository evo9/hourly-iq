import type { Invoice, Payment } from '../types';
import { MONTHS_UA, MONTHS_UA_SHORT } from './format';

export interface MonthYear { month: number; year: number; }
export interface MonthYearRange { from: MonthYear | null; to: MonthYear | null; }

function toVal(my: MonthYear) { return my.year * 12 + my.month; }

export function invoiceInRange(inv: Invoice, filter: { from: MonthYear | null; to: MonthYear | null }): boolean {
  const v = inv.year * 12 + inv.month;
  if (filter.from && v < toVal(filter.from)) return false;
  if (filter.to && v > toVal(filter.to)) return false;
  return true;
}

export function paymentInRange(p: Payment, filter: { from: MonthYear | null; to: MonthYear | null }): boolean {
  const d = new Date(p.paidAt);
  const v = d.getFullYear() * 12 + (d.getMonth() + 1);
  if (filter.from && v < toVal(filter.from)) return false;
  if (filter.to && v > toVal(filter.to)) return false;
  return true;
}

export function calcCarriedDebt(
  allInvoices: Invoice[],
  allPayments: Payment[],
  before: MonthYear,
): number {
  const b = before.year * 12 + before.month;
  const prevInvoices = allInvoices.filter(inv => inv.year * 12 + inv.month < b);
  const prevPayments = allPayments.filter(p => {
    const d = new Date(p.paidAt);
    return d.getFullYear() * 12 + (d.getMonth() + 1) < b;
  });
  const due = prevInvoices.reduce((s, i) => s + i.dueAmount, 0);
  const paid = prevPayments.reduce((s, p) => s + p.amount, 0);
  return Math.max(0, due - paid);
}

export function formatRangeLabel(f: MonthYearRange): string | null {
  if (!f.from && !f.to) return null;
  const from = f.from ? `${MONTHS_UA_SHORT[f.from.month - 1]} ${f.from.year}` : '...';
  const to = f.to ? `${MONTHS_UA_SHORT[f.to.month - 1]} ${f.to.year}` : '...';
  return `${from} — ${to}`;
}

export interface InvoiceMonthGroup {
  key: string;    // '2025-3'
  label: string;  // 'Березень 2025'
  month: number;
  year: number;
  items: Invoice[];
  total: number;  // sum of dueAmount
}

export interface PaymentMonthGroup {
  key: string;
  label: string;
  month: number;
  year: number;
  items: Payment[];
  total: number;  // sum of amount
}

export function groupInvoicesByMonth(invoices: Invoice[]): InvoiceMonthGroup[] {
  if (invoices.length === 0) return [];
  const map = new Map<string, InvoiceMonthGroup>();
  for (const inv of [...invoices].sort((a, b) =>
    b.year !== a.year ? b.year - a.year : b.month - a.month
  )) {
    const key = `${inv.year}-${inv.month}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: `${MONTHS_UA[inv.month - 1]} ${inv.year}`,
        month: inv.month,
        year: inv.year,
        items: [],
        total: 0,
      });
    }
    const g = map.get(key)!;
    g.items.push(inv);
    g.total += inv.dueAmount;
  }
  return Array.from(map.values());
}

export function groupPaymentsByMonth(payments: Payment[]): PaymentMonthGroup[] {
  if (payments.length === 0) return [];
  const map = new Map<string, PaymentMonthGroup>();
  for (const p of payments) {
    const monthKey = p.paidAt.substring(0, 7); // 'YYYY-MM'
    const [yearStr, monthStr] = monthKey.split('-');
    const month = Number(monthStr);
    const year = Number(yearStr);
    const key = `${year}-${month}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: `${MONTHS_UA[month - 1]} ${year}`,
        month,
        year,
        items: [],
        total: 0,
      });
    }
    const g = map.get(key)!;
    g.items.push(p);
    g.total += p.amount;
  }
  // sort groups newest first, sort items within group newest first
  return Array.from(map.values())
    .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month)
    .map(g => ({
      ...g,
      items: [...g.items].sort((a, b) => b.paidAt.localeCompare(a.paidAt)),
    }));
}
