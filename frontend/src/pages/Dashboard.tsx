import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../api/dashboard';
import type { DashboardData } from '../types';
import { formatMoney } from '../utils/format';

interface SummaryCardProps {
  label: string;
  value: string;
  accent?: boolean;
}

function SummaryCard({ label, value, accent }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    dashboardApi
      .get()
      .then(d => {
        setData(d);
        if (d.months.length > 0) {
          const key = `${d.months[0].year}-${d.months[0].month}`;
          setOpenMonths({ [key]: true });
        }
      })
      .catch(() => setError('Помилка завантаження'))
      .finally(() => setLoading(false));
  }, []);

  const toggleMonth = (key: string) => {
    setOpenMonths(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) return <p className="text-gray-500">Завантаження...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!data) return null;

  const { summary, months, debts } = data;

  return (
    <div className="space-y-8">
      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Загальний борг"
          value={formatMoney(summary.totalDebt)}
          accent={summary.totalDebt > 0}
        />
        <SummaryCard
          label="Отримано / місяць"
          value={formatMoney(summary.receivedThisMonth)}
        />
        <SummaryCard
          label="Виставлено / місяць"
          value={formatMoney(summary.pendingThisMonth)}
        />
        <SummaryCard
          label="Клієнти"
          value={String(summary.activeClients)}
        />
      </div>

      {/* ── Debts ── */}
      {debts.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Борги по клієнтах</h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-gray-600 font-medium">Клієнт</th>
                  <th className="text-right px-4 py-2.5 text-gray-600 font-medium hidden sm:table-cell">Виставлено</th>
                  <th className="text-right px-4 py-2.5 text-gray-600 font-medium hidden sm:table-cell">Отримано</th>
                  <th className="text-right px-4 py-2.5 text-gray-600 font-medium">Борг</th>
                  <th className="text-left px-4 py-2.5 text-gray-600 font-medium hidden sm:table-cell">Найстаріший</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {debts.map(d => (
                  <tr key={d.clientId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {d.clientName}
                      <span className="ml-1.5 text-xs text-gray-400">({d.currency})</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 hidden sm:table-cell">
                      {formatMoney(d.totalDue, d.currency)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 hidden sm:table-cell">
                      {formatMoney(d.totalPaid, d.currency)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">
                      {formatMoney(d.debt, d.currency)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                      {d.oldestUnpaidMonth ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate(`/clients/${d.clientId}`)}
                        className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        Деталі →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : months.length > 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700 text-sm font-medium">
          Всі розрахунки в порядку ✓
        </div>
      ) : null}

      {debts.length === 0 && months.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">Даних ще немає</p>
          <p className="text-sm mt-1">Додайте клієнтів та інвойси щоб бачити аналітику</p>
        </div>
      )}

      {/* ── Months accordion ── */}
      {months.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">По місяцях</h2>
          <div className="space-y-2">
            {months.map(m => {
              const key = `${m.year}-${m.month}`;
              const isOpen = !!openMonths[key];
              return (
                <div key={key} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {/* Month header */}
                  <button
                    onClick={() => toggleMonth(key)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-semibold text-gray-900">{m.label}</span>
                    <div className="flex items-center gap-4 text-sm">
                      {m.totalInvoiced > 0 && (
                        <span className="text-gray-500">
                          Виставлено: <span className="text-gray-900 font-medium">{formatMoney(m.totalInvoiced)}</span>
                        </span>
                      )}
                      {m.totalReceived > 0 && (
                        <span className="text-gray-500">
                          Отримано: <span className="text-green-700 font-medium">{formatMoney(m.totalReceived)}</span>
                        </span>
                      )}
                      <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {/* Month body — 2-column grid */}
                  {isOpen && (
                    <div className="border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                      {/* Left: invoices */}
                      <div className="p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Виставлено ({formatMoney(m.totalInvoiced)})
                        </p>
                        {m.invoices.length === 0 ? (
                          <p className="text-sm text-gray-400">—</p>
                        ) : (
                          <div className="space-y-1">
                            {m.invoices.map(inv => (
                              <div
                                key={inv.id}
                                onClick={() => navigate(`/clients/${inv.clientId}`)}
                                className="flex justify-between items-baseline text-sm cursor-pointer hover:text-blue-600 transition-colors"
                              >
                                <span className="text-gray-800">
                                  {inv.clientName}
                                  {inv.description && (
                                    <span className="ml-1 text-xs text-gray-400">{inv.description}</span>
                                  )}
                                </span>
                                <span className="font-medium text-gray-700 ml-2 shrink-0">
                                  {formatMoney(inv.dueAmount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: payments */}
                      <div className="p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Отримано ({formatMoney(m.totalReceived)})
                        </p>
                        {m.payments.length === 0 ? (
                          <p className="text-sm text-gray-400">—</p>
                        ) : (
                          <div className="space-y-1">
                            {m.payments.map(p => (
                              <div key={p.id} className="flex justify-between items-baseline text-sm">
                                <span className="text-gray-500">
                                  {p.paidAt}
                                  {p.note && (
                                    <span className="ml-1 text-xs text-gray-400">«{p.note}»</span>
                                  )}
                                </span>
                                <span className="font-medium text-gray-700 ml-2 shrink-0">
                                  {formatMoney(p.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
