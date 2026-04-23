export interface Client {
  id: number;
  name: string;
  currency: string;
  defaultRate: number | null;
  notes: string | null;
  createdAt: string;
}

export interface Invoice {
  id: number;
  clientId: number;
  client?: Client;
  month: number;
  year: number;
  rate: number;
  hours: number;
  amount: number;
  dueAmount: number;
  description: string | null;
  createdAt: string;
}

export interface Payment {
  id: number;
  clientId: number;
  amount: number;
  paidAt: string;
  note: string | null;
  createdAt: string;
}

export interface DashboardData {
  summary: {
    totalDebt: number;
    receivedThisMonth: number;
    pendingThisMonth: number;
    activeClients: number;
  };
  months: MonthGroup[];
  debts: DebtEntry[];
}

export interface MonthGroup {
  month: number;
  year: number;
  label: string;
  invoices: InvoiceSummary[];
  totalInvoiced: number;
  payments: PaymentSummary[];
  totalReceived: number;
}

export interface InvoiceSummary {
  id: number;
  clientId: number;
  clientName: string;
  rate: number;
  hours: number;
  amount: number;
  dueAmount: number;
  description: string;
}

export interface PaymentSummary {
  id: number;
  clientId: number;
  clientName: string;
  amount: number;
  paidAt: string;
  note: string;
}

export interface DebtEntry {
  clientId: number;
  clientName: string;
  currency: string;
  totalDue: number;
  totalPaid: number;
  debt: number;
  oldestUnpaidMonth: string | null;
  invoiceCount: number;
}
