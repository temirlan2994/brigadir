import { Eye, EyeOff } from 'lucide-react';
import { useT } from '../i18n';
import { useView } from '../state/view';

// Переключатель «показать заказчику»: прячет цены бригады и прибыль
export function CustomerModeButton() {
  const t = useT();
  const customerMode = useView((v) => v.customerMode);
  const toggle = useView((v) => v.toggleCustomerMode);
  return (
    <button
      data-testid="customer-mode"
      onClick={toggle}
      className={`flex min-h-[44px] max-w-[150px] items-center gap-1.5 rounded-full px-3 text-left text-[12px] font-bold leading-tight ${
        customerMode ? 'bg-dark text-white' : 'bg-white text-ink shadow-card'
      }`}
    >
      {customerMode ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
      {customerMode ? t('view.customerOn') : t('view.customerOff')}
    </button>
  );
}
