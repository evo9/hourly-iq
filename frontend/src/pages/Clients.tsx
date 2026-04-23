import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { clientsApi } from '../api/clients';
import { invoicesApi } from '../api/invoices';
import { paymentsApi } from '../api/payments';
import type { Client, Invoice, Payment } from '../types';
import Modal from '../components/Modal';
import { formatMoney } from '../utils/format';

// ─── Client form ──────────────────────────────────────────────────────────────

interface ClientForm {
  name: string;
  currency: string;
  defaultRate: string;
  notes: string;
}

const emptyForm = (): ClientForm => ({ name: '', currency: 'USD', defaultRate: '', notes: '' });

function clientToForm(c: Client): ClientForm {
  return {
    name: c.name,
    currency: c.currency,
    defaultRate: c.defaultRate != null ? String(c.defaultRate) : '',
    notes: c.notes ?? '',
  };
}

// ─── Client form modal (shared) ───────────────────────────────────────────────

interface ClientModalProps {
  open: boolean;
  onClose: () => void;
  editing: Client | null;
  form: ClientForm;
  setForm: React.Dispatch<React.SetStateAction<ClientForm>>;
  onSave: (e: React.FormEvent) => void;
  saving: boolean;
}

export function ClientFormModal({ open, onClose, editing, form, setForm, onSave, saving }: ClientModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Редагувати клієнта' : 'Новий клієнт'}>
      <form onSubmit={onSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Назва *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Валюта *</label>
          <select
            value={form.currency}
            onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="UAH">UAH</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Рейт за замовчуванням</label>
          <input
            type="number"
            value={form.defaultRate}
            onChange={e => setForm(f => ({ ...f, defaultRate: e.target.value }))}
            min="0"
            step="0.01"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Нотатки</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
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
  );
}

// ─── Home page ────────────────────────────────────────────────────────────────

export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([clientsApi.getAll(), invoicesApi.getAll(), paymentsApi.getAll()])
      .then(([cls, invs, pays]) => {
        setClients(cls);
        setInvoices(invs);
        setPayments(pays);
      })
      .catch(() => setError('Помилка завантаження'))
      .finally(() => setLoading(false));
  }, [version]);

  // Per-client totals computed on frontend
  const invoicedByClient = new Map<number, number>();
  for (const inv of invoices) {
    invoicedByClient.set(inv.clientId, (invoicedByClient.get(inv.clientId) ?? 0) + inv.dueAmount);
  }
  const paidByClient = new Map<number, number>();
  for (const p of payments) {
    paidByClient.set(p.clientId, (paidByClient.get(p.clientId) ?? 0) + p.amount);
  }

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (c: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(c);
    setForm(clientToForm(c));
    setModalOpen(true);
  };

  const handleDelete = async (c: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Видалити клієнта «${c.name}»?\nВсі інвойси та виплати буде видалено.`)) return;
    try {
      await clientsApi.remove(c.id);
      toast.success('Клієнта видалено');
      setVersion(v => v + 1);
    } catch {
      toast.error('Помилка при видаленні');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data: Partial<Client> = {
        name: form.name.trim(),
        currency: form.currency,
        ...(form.defaultRate ? { defaultRate: Number(form.defaultRate) } : { defaultRate: null }),
        notes: form.notes.trim() || null,
      };
      if (editing) {
        await clientsApi.update(editing.id, data);
      } else {
        await clientsApi.create(data);
      }
      setModalOpen(false);
      toast.success(editing ? 'Клієнта оновлено' : 'Клієнта створено');
      setVersion(v => v + 1);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(axiosErr.response?.data?.message ?? 'Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Клієнти</h1>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Додати клієнта
        </button>
      </div>

      {loading && <p className="text-gray-500">Завантаження...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && clients.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">Клієнтів поки немає</p>
          <button
            onClick={openCreate}
            className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Додати першого клієнта
          </button>
        </div>
      )}

      {!loading && !error && clients.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-gray-600 font-medium">Клієнт</th>
                <th className="text-right px-4 py-2.5 text-gray-600 font-medium hidden sm:table-cell">Виставлено</th>
                <th className="text-right px-4 py-2.5 text-gray-600 font-medium hidden sm:table-cell">Отримано</th>
                <th className="text-right px-4 py-2.5 text-gray-600 font-medium">Борг</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map(c => {
                const totalDue = invoicedByClient.get(c.id) ?? 0;
                const totalPaid = paidByClient.get(c.id) ?? 0;
                const debt = Math.max(0, totalDue - totalPaid);
                return (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/clients/${c.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{c.name}</span>
                      <span className="ml-1.5 text-xs text-gray-400">({c.currency})</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 hidden sm:table-cell">
                      {formatMoney(totalDue, c.currency)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 hidden sm:table-cell">
                      {formatMoney(totalPaid, c.currency)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {debt > 0
                        ? <span className="text-red-600">{formatMoney(debt, c.currency)}</span>
                        : <span className="text-gray-400">✓</span>
                      }
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={e => openEdit(c, e)}
                          className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
                        >
                          Ред.
                        </button>
                        <button
                          onClick={() => navigate(`/clients/${c.id}`)}
                          className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          Деталі →
                        </button>
                        <button
                          onClick={e => handleDelete(c, e)}
                          className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          Вид.
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ClientFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        form={form}
        setForm={setForm}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}

export { clientToForm };
export type { ClientForm };
