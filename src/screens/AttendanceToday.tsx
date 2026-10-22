import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useT, useLangStore, formatDateShort } from '../i18n';
import { useActiveObject, useAttendance, useWorkers } from '../lib/hooks';
import { setAttendance, todayStr } from '../db/repo';
import { useToast } from '../state/toast';
import { ScreenHeader } from '../components/ScreenHeader';
import { BigButton } from '../components/BigButton';
import { DatePick } from '../components/DatePick';
import { WorkerCircle } from '../components/WorkerCircle';

// Кто сегодня вышел: одна строка галочек вечером
export function AttendanceToday() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const navigate = useNavigate();
  const toast = useToast();
  const activeObject = useActiveObject();
  const workers = useWorkers().filter((w) => !w.archivedAt);
  const [date, setDate] = useState(todayStr());
  const saved = useAttendance(activeObject?.id, date);
  const [ids, setIds] = useState<string[]>([]);
  const [loadedFor, setLoadedFor] = useState('');

  // Подставляем сохранённое за день, когда запрос за этот день действительно отработал
  useEffect(() => {
    if (!activeObject || saved === undefined) return;
    const key = `${activeObject.id}:${date}`;
    if (loadedFor === key) return;
    setIds(saved?.workerIds ?? []);
    setLoadedFor(key);
  }, [saved, date, activeObject, loadedFor]);

  function toggle(id: string) {
    setIds(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  }

  async function save() {
    if (!activeObject) return;
    await setAttendance(activeObject.id, date, ids);
    navigate(-1);
    toast.show(t('common.saved'));
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper pb-6">
      <ScreenHeader title={t('attendance.title')} sub={activeObject?.name} />
      <div className="flex flex-1 flex-col gap-3 px-4">
        <DatePick value={date} onChange={setDate} />
        <p className="px-1 text-[14px] text-slate-500">{t('attendance.hint', { date: formatDateShort(date, lang) })}</p>
        <div className="flex flex-col gap-2">
          {workers.map((w) => {
            const on = ids.includes(w.id);
            return (
              <button key={w.id} data-testid={`att-${w.name}`} className={`flex min-h-[64px] items-center gap-3 rounded-[16px] px-3.5 shadow-card ${on ? 'bg-amber-50 ring-2 ring-accent' : 'bg-white'}`} onClick={() => toggle(w.id)}>
                <WorkerCircle worker={w} size={42} />
                <span className="flex-1 text-left text-[17px] font-semibold">{w.name}</span>
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg border-2 ${on ? 'border-ink bg-ink text-white' : 'border-slate-300'}`}>
                  {on && <Check size={18} strokeWidth={3} aria-hidden="true" />}
                </span>
              </button>
            );
          })}
          {workers.length === 0 && <p className="py-6 text-center text-[16px] text-slate-400">{t('workers.emptyList')}</p>}
        </div>
        <div className="mt-auto">
          <BigButton label={t('common.save')} onClick={() => void save()} disabled={!activeObject} testId="save-attendance" />
        </div>
      </div>
    </div>
  );
}
