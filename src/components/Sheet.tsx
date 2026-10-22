import { useRef, type ReactNode } from 'react';
import { useT } from '../i18n';

// Нижний лист. Тап по затемнению, пока открыта клавиатура (фокус в поле),
// только убирает клавиатуру — ввод не теряется. Закрытие — второй тап или «Отмена».
// Фокус проверяем на pointerdown: к моменту click браузер уже снял его с поля.
export function Sheet({ onClose, children, cancel = true, testId }: {
  onClose: () => void;
  children: ReactNode;
  cancel?: boolean;
  testId?: string;
}) {
  const t = useT();
  const hadInputFocus = useRef(false);

  function rememberFocus() {
    const el = document.activeElement;
    hadInputFocus.current = el instanceof HTMLElement
      && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
  }

  function backdropTap() {
    if (hadInputFocus.current) {
      hadInputFocus.current = false;
      const el = document.activeElement;
      if (el instanceof HTMLElement) el.blur();
      return;
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onPointerDown={(e) => { if (e.target === e.currentTarget) rememberFocus(); }}
      onClick={(e) => { if (e.target === e.currentTarget) backdropTap(); }}
      data-testid={testId}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-[430px] flex-col gap-2 overflow-y-auto rounded-t-[28px] bg-white p-4 pb-[calc(2rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        {cancel && (
          <button className="min-h-[48px] text-[15px] font-semibold text-slate-500" onClick={onClose}>
            {t('common.cancel')}
          </button>
        )}
      </div>
    </div>
  );
}
