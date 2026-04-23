import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { clientsApi } from '../api/clients';
import { invoicesApi } from '../api/invoices';
import { paymentsApi } from '../api/payments';
import type { Client, Invoice, Payment } from '../types';
import { formatMoney } from '../utils/format';
import { invoiceInRange, paymentInRange, formatRangeLabel, calcCarriedDebt } from '../utils/groupByMonth';
import type { MonthYearRange } from '../utils/groupByMonth';
import InvoicesPanel from '../components/InvoicesPanel';
import PaymentsPanel from '../components/PaymentsPanel';
import { ClientFormModal, clientToForm } from './Clients';
import type { ClientForm } from './Clients';
import { PdfDownloadButton } from '../pdf/ClientReportPdf';

// ─── Summary bar ──────────────────────────────────────────────────────────────

interface SummaryBarProps {
  client: Client;
  invoices: Invoice[];
  payments: Payment[];
  invoiceFilter: MonthYearRange;
  paymentFilter: MonthYearRange;
}

function ClientSummaryBar({ client, invoices, payments, invoiceFilter, paymentFilter }: SummaryBarProps) {
  const filteredInvoices = invoices.filter(inv => invoiceInRange(inv, invoiceFilter));
  const filteredPayments = payments.filter(p => paymentInRange(p, paymentFilter));

  const totalInvoiced = filteredInvoices.reduce((s, inv) => s + inv.dueAmount, 0);
  const totalPaid = filteredPayments.reduce((s, p) => s + p.amount, 0);
  const debt = Math.max(0, totalInvoiced - totalPaid);
  const currency = client.currency;

  const carriedDebt = invoiceFilter.from
    ? calcCarriedDebt(invoices, payments, invoiceFilter.from)
    : 0;

  const invoiceLabel = formatRangeLabel(invoiceFilter);
  const paymentLabel = formatRangeLabel(paymentFilter);
  const rangeStr = [
    invoiceLabel ? `Інвойси: ${invoiceLabel}` : null,
    paymentLabel ? `Виплати: ${paymentLabel}` : null,
  ].filter(Boolean).join('  ·  ');

  return (
    <div className="client-summary-bar bg-white rounded-lg border border-gray-200 px-5 py-3 text-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
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
            {carriedDebt > 0 && invoiceFilter.from && (
              <span className="text-gray-500">
                Перенесений борг:{' '}
                <span className="font-semibold text-red-600">- {formatMoney(carriedDebt, currency)}</span>
              </span>
            )}
          </div>
          {rangeStr && (
            <div className="text-xs text-gray-400">{rangeStr}</div>
          )}
        </div>
        <PdfDownloadButton
          client={client}
          invoices={invoices}
          payments={payments}
          invoiceFilter={invoiceFilter}
          paymentFilter={paymentFilter}
        />
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

  // Mobile tab
  const [tab, setTab] = useState<'invoices' | 'payments'>('invoices');

  // Client edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<ClientForm>({ name: '', currency: 'USD', defaultRate: '', notes: '' });
  const [savingClient, setSavingClient] = useState(false);

  // Independent filters
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
      <ClientSummaryBar
        client={client}
        invoices={invoices}
        payments={payments}
        invoiceFilter={invoiceFilter}
        paymentFilter={paymentFilter}
      />

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
