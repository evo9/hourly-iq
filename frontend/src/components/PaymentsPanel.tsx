import { useState } from 'react';
import toast from 'react-hot-toast';
import { paymentsApi } from '../api/payments';
import type { Payment } from '../types';
import Modal from './Modal';
import { formatMoney } from '../utils/format';
import { groupPaymentsByMonth, paymentInRange } from '../utils/groupByMonth';
import type { MonthYearRange } from '../utils/groupByMonth';
import MonthRangeFilter from './MonthRangeFilter';

// ─── Payment form ─────────────────────────────────────────────────────────────

interface PaymentForm {
  paidAt: string;
  amount: string;
  note: string;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  payments: Payment[];
  currency: string;
  clientId: number;
  currentDebt: number;
  onMutate: () => void;
  filter: MonthYearRange;
  onFilterChange: (v: MonthYearRange) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

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
      {/* ── Panel header: title + add button ── */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-800 shrink-0">Виплати</h2>
        <button
          onClick={openCreate}
          className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 shrink-0"
        >
          + Додати виплату
        </button>
      </div>
      <div>
        <MonthRangeFilter value={filter} onChange={onFilterChange} yearOptions={yearOptions} />
      </div>

      {groups.length === 0 ? (
        <p className="text-gray-400 text-sm">Виплат ще не було</p>
      ) : (
        <div className="space-y-3">
          {groups.map(group => {
            const isOpen = expanded.has(group.key);
            return (
              <div key={group.key} className="month-group bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Month header — clickable */}
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
                {/* Payment rows */}
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

      {/* ── Payment Modal ── */}
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
