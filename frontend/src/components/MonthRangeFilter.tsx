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
