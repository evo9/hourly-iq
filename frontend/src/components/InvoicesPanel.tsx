import { useState } from 'react';
import toast from 'react-hot-toast';
import { invoicesApi } from '../api/invoices';
import type { Invoice } from '../types';
import Modal from './Modal';
import { MONTHS_UA, formatMoney } from '../utils/format';
import { groupInvoicesByMonth, invoiceInRange } from '../utils/groupByMonth';
import type { MonthYearRange } from '../utils/groupByMonth';
import MonthRangeFilter from './MonthRangeFilter';

// ─── Invoice form ─────────────────────────────────────────────────────────────

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

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  invoices: Invoice[];
  currency: string;
  clientId: number;
  defaultRate: number | null;
  onMutate: () => void;
  filter: MonthYearRange;
  onFilterChange: (v: MonthYearRange) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InvoicesPanel({
  invoices,
  currency,
  clientId,
  defaultRate,
  onMutate,
  filter,
  onFilterChange,
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
      {/* ── Panel header: title + add button ── */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-800 shrink-0">Інвойси</h2>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 shrink-0"
        >
          + Додати інвойс
        </button>
      </div>
      <div>
        <MonthRangeFilter value={filter} onChange={onFilterChange} yearOptions={yearOptions} />
      </div>

      {groups.length === 0 ? (
        <p className="text-gray-400 text-sm">Інвойсів ще немає — додайте перший</p>
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
                    <span className={`text-gray-400 text-xs transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                  </div>
                </button>
                {/* Invoice cards */}
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

      {/* ── Invoice Modal ── */}
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
