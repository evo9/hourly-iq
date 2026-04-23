import { formatMoney } from '../utils/format';


interface CurrencyValueProps {
  amount: number;
  currency?: string;
  className?: string;
}

export default function CurrencyValue({ amount, currency = 'USD', className }: CurrencyValueProps) {
  return <span className={className}>{formatMoney(amount, currency)}</span>;
}
