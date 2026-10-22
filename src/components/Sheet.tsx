import { useRef, type ReactNode } from 'react';
import { useT } from '../i18n';
import { useKeypad } from '../state/keypad';

// Нижний лист. Тап по затемнению, пока открыта клавиатура (системная или нампад),
// только убирает клавиатуру — ввод не теряется. Закрытие — второй тап или «Отмена».
// Фокус проверяем на pointerdown: к моменту click браузер уже снял его с поля.
// Открытый нампад поднимает лист над собой (--kb-h).
export function Sheet({ onClose, children, cancel = true, testId, title }: {
  onClose: () => void;
  children: ReactNode;
  cancel?: boolean;
  testId?: string;
  title?: string;
}) {
  const t = useT();
  const hadInputFocus = useRef(false);

  function rememberFocus() {
    const el = document.activeElement;
    hadInputFocus.current = (el instanceof HTMLElement
      && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'))
      || useKeypad.getState().target !== null;
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
      style={{ paddingBottom: 'var(--kb-h, 0px)' }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) rememberFocus(); }}
      onClick={(e) => { if (e.target === e.currentTarget) backdropTap(); }}
      data-testid={testId}
    >
      <div
        className="flex w-full max-w-[430px] flex-col gap-2 overflow-y-auto rounded-t-[28px] bg-white p-4 pb-[calc(2rem+env(safe-area-inset-bottom))]"
        style={{ maxHeight: 'calc(88vh - var(--kb-h, 0px))' }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="pb-1 text-[20px] font-extrabold">{title}</h2>}
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
