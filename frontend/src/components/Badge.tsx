interface BadgeProps {
  status: 'pending' | 'partial' | 'paid' | string;
}

const CONFIG = {
  pending: { label: 'Очікується', className: 'bg-yellow-100 text-yellow-800' },
  partial: { label: 'Частково', className: 'bg-blue-100 text-blue-800' },
  paid:    { label: 'Оплачено',  className: 'bg-green-100 text-green-800' },
};

export default function Badge({ status }: BadgeProps) {
  const cfg = CONFIG[status as keyof typeof CONFIG] ?? { label: status, className: 'bg-gray-100 text-gray-800' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
