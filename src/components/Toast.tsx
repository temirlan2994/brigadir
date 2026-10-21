import { useToast } from '../state/toast';
import { useT } from '../i18n';

export function Toast() {
  const t = useT();
  const { message, undo, hide } = useToast();
  if (!message) return null;
  return (
    <div className="fixed bottom-24 left-1/2 z-50 w-[calc(100%-32px)] max-w-[398px] -translate-x-1/2">
      <div className="flex items-center justify-between rounded-[18px] bg-dark px-5 py-4 text-white shadow-lg">
        <span className="text-[17px] font-semibold">{message}</span>
        {undo && (
          <button
            className="ml-4 min-h-[44px] rounded-xl bg-accent px-4 text-[16px] font-bold text-ink"
            onClick={async () => { await undo(); hide(); }}
          >
            {t('common.undo')}
          </button>
        )}
      </div>
    </div>
  );
}
