import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../clients/client.entity';
import { Invoice } from '../invoices/invoice.entity';
import { Payment } from '../payments/payment.entity';

const MONTH_NAMES = [
  'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень',
];

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
  ) {}

  async getData() {
    const [clients, invoices, payments] = await Promise.all([
      this.clientRepo.find({ order: { name: 'ASC' } }),
      this.invoiceRepo.find(),
      this.paymentRepo.find(),
    ]);

    const clientMap = new Map(clients.map((c) => [c.id, c]));

    // Debt per client: SUM(invoices.dueAmount) - SUM(payments.amount)
    const invoicedByClient = new Map<number, number>();
    for (const inv of invoices) {
      invoicedByClient.set(inv.clientId, round2((invoicedByClient.get(inv.clientId) ?? 0) + inv.dueAmount));
    }
    const paidByClient = new Map<number, number>();
    for (const p of payments) {
      paidByClient.set(p.clientId, round2((paidByClient.get(p.clientId) ?? 0) + p.amount));
    }

    // Summary
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const curPrefix = `${curYear}-${String(curMonth).padStart(2, '0')}`;

    let totalDebt = 0;
    let receivedThisMonth = 0;
    let pendingThisMonth = 0;

    for (const [clientId, due] of invoicedByClient) {
      const paid = paidByClient.get(clientId) ?? 0;
      totalDebt = round2(totalDebt + Math.max(0, due - paid));
    }

    for (const p of payments) {
      if (p.paidAt?.startsWith(curPrefix)) {
        receivedThisMonth = round2(receivedThisMonth + p.amount);
      }
    }

    for (const inv of invoices) {
      if (inv.month === curMonth && inv.year === curYear) {
        const clientDue = invoicedByClient.get(inv.clientId) ?? 0;
        const clientPaid = paidByClient.get(inv.clientId) ?? 0;
        const clientDebt = Math.max(0, clientDue - clientPaid);
        // Approximate: add invoice's dueAmount proportion of client debt
        pendingThisMonth = round2(pendingThisMonth + inv.dueAmount);
      }
    }

    const summary = {
      totalDebt,
      receivedThisMonth,
      pendingThisMonth,
      activeClients: clients.length,
    };

    // Build months — union of invoice months and payment months
    type MonthKey = string;
    const monthSet = new Set<MonthKey>();

    for (const inv of invoices) {
      monthSet.add(`${inv.year}-${String(inv.month).padStart(2, '0')}`);
    }
    for (const p of payments) {
      if (p.paidAt) {
        monthSet.add(p.paidAt.substring(0, 7));
      }
    }

    const months = Array.from(monthSet)
      .sort((a, b) => b.localeCompare(a))
      .map((key) => {
        const [yearStr, monthStr] = key.split('-');
        const year = Number(yearStr);
        const month = Number(monthStr);

        const monthInvoices = invoices
          .filter((inv) => inv.year === year && inv.month === month)
          .map((inv) => ({
            id: inv.id,
            clientId: inv.clientId,
            clientName: clientMap.get(inv.clientId)?.name ?? '',
            rate: inv.rate,
            hours: inv.hours,
            amount: inv.amount,
            dueAmount: inv.dueAmount,
            description: inv.description ?? '',
          }));

        const monthPayments = payments
          .filter((p) => p.paidAt?.startsWith(key))
          .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
          .map((p) => ({
            id: p.id,
            clientId: p.clientId,
            clientName: clientMap.get(p.clientId)?.name ?? '',
            amount: p.amount,
            paidAt: p.paidAt,
            note: p.note ?? '',
          }));

        const totalInvoiced = round2(monthInvoices.reduce((s, i) => s + i.dueAmount, 0));
        const totalReceived = round2(monthPayments.reduce((s, p) => s + p.amount, 0));

        return {
          month,
          year,
          label: `${MONTH_NAMES[month - 1]} ${year}`,
          invoices: monthInvoices,
          totalInvoiced,
          payments: monthPayments,
          totalReceived,
        };
      });

    // Debts — only clients with debt > 0, sorted desc by debt
    const debts = clients
      .map((client) => {
        const totalDue = invoicedByClient.get(client.id) ?? 0;
        const totalPaid = paidByClient.get(client.id) ?? 0;
        const debt = round2(Math.max(0, totalDue - totalPaid));

        // Find oldest invoice for this client (any invoice, for context)
        const clientInvoices = invoices.filter((inv) => inv.clientId === client.id);
        const oldestInvoice = clientInvoices.reduce<Invoice | null>((oldest, inv) => {
          if (!oldest) return inv;
          return inv.year < oldest.year || (inv.year === oldest.year && inv.month < oldest.month) ? inv : oldest;
        }, null);

        return {
          clientId: client.id,
          clientName: client.name,
          currency: client.currency,
          totalDue,
          totalPaid,
          debt,
          oldestUnpaidMonth: oldestInvoice
            ? `${MONTH_NAMES[oldestInvoice.month - 1]} ${oldestInvoice.year}`
            : null,
          invoiceCount: clientInvoices.length,
        };
      })
      .filter((d) => d.debt > 0)
      .sort((a, b) => b.debt - a.debt);

    return { summary, months, debts };
  }
}
