import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useT } from '../i18n';
import { useKeypad } from '../state/keypad';
import { NumPad } from './NumPad';

const TOP_INSET = 72;
const MARGIN = 16;

function fieldEl(id: string): HTMLElement | null {
  return document.querySelector(`[data-numfield="${CSS.escape(id)}"]`);
}

// Поле должно быть видно над клавиатурой: сначала внутри шторки, потом на странице
function reveal(id: string, keypadHeight: number) {
  const el = fieldEl(id);
  if (!el) return;
  const visibleBottom = window.innerHeight - keypadHeight - MARGIN;
  let box: HTMLElement | null = el.parentElement;
  while (box && box !== document.body) {
    const oy = getComputedStyle(box).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && box.scrollHeight > box.clientHeight) break;
    box = box.parentElement;
  }
  if (box && box !== document.body) {
    const r = el.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    const bottom = Math.min(b.bottom - MARGIN, visibleBottom);
    if (r.bottom > bottom) box.scrollTop += r.bottom - bottom;
    else if (r.top < b.top + MARGIN) box.scrollTop -= b.top + MARGIN - r.top;
  }
  const r = el.getBoundingClientRect();
  if (r.bottom > visibleBottom) window.scrollBy({ top: r.bottom - visibleBottom, behavior: 'smooth' });
  else if (r.top < TOP_INSET) window.scrollBy({ top: r.top - TOP_INSET, behavior: 'smooth' });
}

// Следующее числовое поле на экране — для кнопки «Дальше»
function nextField(id: string): HTMLElement | undefined {
  const all = [...document.querySelectorAll<HTMLElement>('[data-numfield]')];
  const i = all.findIndex((el) => el.dataset.numfield === id);
  return i >= 0 ? all[i + 1] : undefined;
}

// Нижний нампад для числовых полей. Высота уходит в --kb-h:
// страница и шторки получают отступ снизу, поле прокручивается над клавиатурой.
export function KeypadHost() {
  const t = useT();
  const target = useKeypad((s) => s.target);
  const location = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    useKeypad.getState().close('route');
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!target) return;
    // Тап мимо поля и клавиатуры закрывает её. Слушаем на всплытии, чтобы шторка
    // успела заметить открытую клавиатуру и не закрылась сама от того же тапа
    function onDown(e: PointerEvent) {
      const el = e.target instanceof Element ? e.target : null;
      if (!el || el.closest('[data-keypad]') || el.closest('[data-numfield]')) return;
      useKeypad.getState().close('outside');
    }
    function onFocus(e: FocusEvent) {
      const el = e.target instanceof Element ? e.target : null;
      if (el && el.matches('input, textarea, select')) useKeypad.getState().close('outside');
    }
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('focusin', onFocus, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('focusin', onFocus, true);
    };
  }, [target]);

  useLayoutEffect(() => {
    const height = target && ref.current ? ref.current.offsetHeight : 0;
    document.documentElement.style.setProperty('--kb-h', `${height}px`);
    if (!target) return;
    const id = target.id;
    const raf = requestAnimationFrame(() => reveal(id, height));
    return () => cancelAnimationFrame(raf);
  }, [target]);

  if (!target) return null;
  const next = nextField(target.id);

  return createPortal(
    <div
      ref={ref}
      data-keypad
      className="no-print fixed inset-x-0 bottom-0 z-[60] mx-auto w-full max-w-[430px] rounded-t-[24px] bg-white px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-10px_30px_rgba(31,41,55,.18)]"
    >
      <div className="flex items-center gap-2 pb-2.5">
        <span className="min-w-0 flex-1 truncate px-1 text-[14px] font-semibold text-slate-500">{target.label}</span>
        {next && (
          <button
            className="flex min-h-[44px] items-center gap-0.5 rounded-[12px] bg-paper px-3.5 text-[15px] font-bold"
            onClick={() => next.click()}
            data-testid="keypad-next"
          >
            {t('common.next')}
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        )}
        <button
          className="min-h-[44px] rounded-[12px] bg-accent px-5 text-[15px] font-bold text-ink"
          onClick={() => useKeypad.getState().close('done')}
          data-testid="keypad-done"
        >
          {t('common.done')}
        </button>
      </div>
      <NumPad onKey={(key) => useKeypad.getState().press(key)} allowComma={target.decimals > 0} />
    </div>,
    document.body,
  );
}
