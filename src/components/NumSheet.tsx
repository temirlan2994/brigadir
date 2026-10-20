import { useState } from 'react';
import { NumPad } from './NumPad';
import { BigButton } from './BigButton';
import { useT } from '../i18n';

// Нижний лист с нампадом для редактирования одного числа
export function NumSheet({ title, initial, onSave, onClose }: {
  title: string;
  initial: string;
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [value, setValue] = useState(initial);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-[430px] rounded-t-3xl bg-white p-4 pb-8" onClick={(e) => e.stopPropagation()}>
        <p className="pb-1 text-[16px] text-slate-600">{title}</p>
        <p className="pb-3 text-center text-[36px] font-bold">{value || '0'}</p>
        <NumPad value={value} onChange={setValue} />
        <div className="mt-3">
          <BigButton label={t('common.done')} onClick={() => { onSave(value); onClose(); }} />
        </div>
      </div>
    </div>
  );
}
