import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Minus, Plus } from 'lucide-react';
import { useT, useLangStore } from '../i18n';
import { db } from '../db/db';
import { useActiveObject, useWorkers, useWorkTypes } from '../lib/hooks';
import { useDraft } from '../state/draft';
import { activeEntries, calcArea, lineTotals, splitShares } from '../core/calc';
import { formatMoney, parseDecimal, somsToTyiyn, tyiynToSomsInput, formatQuantity } from '../core/format';
import { addWorker, addWorkEntry, getRate, hardDelete, reviseWorkEntry, todayStr, upsertRate } from '../db/repo';
import { useToast } from '../state/toast';
import { ScreenHeader } from '../components/ScreenHeader';
import { ProgressDots } from '../components/ProgressDots';
import { NumPadPanel } from '../components/NumPadPanel';
import { Tile } from '../components/Tile';
import { BigButton } from '../components/BigButton';
import { Segmented } from '../components/Segmented';
import { DatePick } from '../components/DatePick';
import { PhotoPicker } from '../components/PhotoPicker';
import { WorkerCircle } from '../components/WorkerCircle';
import { wtLabel } from '../lib/summary';
import type { WorkEntry } from '../db/types';

const STEP_COUNT = 4;

function historyIdx(): number {
  return (window.history.state as { idx?: number } | null)?.idx ?? 0;
}

// Мастер «Сделали работу»: один вопрос на экран.
// Шаг лежит в адресе (?step=N), поэтому системная кнопка «Назад»
// ходит по шагам и не стирает черновик.
export function WorkWizard() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { draft, set, reset } = useDraft();
  const [searchParams] = useSearchParams();
  const step = Math.min(STEP_COUNT - 1, Math.max(0, Number(searchParams.get('step') ?? '0') || 0));
  const workTypes = useWorkTypes();
  const workers = useWorkers();
  const activeObject = useActiveObject();
  const entriesRaw = useLiveQuery(() => db.workEntries.toArray(), []);
  const entries = useMemo(() => entriesRaw ?? [], [entriesRaw]);
  const objectsRaw = useLiveQuery(() => db.objects.toArray(), []);
  const [showAll, setShowAll] = useState(false);
  const [focus, setFocus] = useState('');
  const [newWorkerName, setNewWorkerName] = useState<string | null>(null);
  const [ratePrices, setRatePrices] = useState<{ customer: string; worker: string }>({ customer: '', worker: '' });
  const [ready, setReady] = useState(false);
  const entryIdxRef = useRef(0);

  const editId = (location.state as { editId?: string } | null)?.editId;
  const editEntry = editId ? entries.find((e) => e.id === editId) : undefined;
  const isEdit = Boolean(editId && editEntry);

  const lastEntry = useMemo(() => {
    const act = activeEntries(entries).filter((e) => e.objectId === activeObject?.id);
    return act.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }, [entries, activeObject]);

  function prefillFromEntry(e: WorkEntry, forEdit: boolean) {
    const shiftInputs: Record<string, string> = {};
    const manualInputs: Record<string, string> = {};
    for (const s of e.shares) {
      shiftInputs[s.workerId] = String(s.weight);
      manualInputs[s.workerId] = tyiynToSomsInput(s.amount);
    }
    reset({
      editId: forEdit ? e.id : undefined,
      objectId: e.objectId,
      workTypeId: e.workTypeId,
      quantityInput: String(e.quantity).replace('.', ','),
      customerPriceInput: tyiynToSomsInput(e.customerPrice),
      workerPriceInput: tyiynToSomsInput(e.workerPrice),
      workerIds: e.shares.map((s) => s.workerId),
      splitMode: e.splitMode,
      shiftInputs: e.splitMode === 'shifts' ? shiftInputs : {},
      manualInputs: e.splitMode === 'manual' ? manualInputs : {},
      date: forEdit ? e.date : todayStr(),
      note: forEdit ? (e.note ?? '') : '',
      photoIds: forEdit ? e.photoIds : [],
    });
  }

  // Инициализация после загрузки записей (иначе гонка: правка и «участники
  // прошлой записи» подставлялись бы из пустого списка)
  useEffect(() => {
    if (ready || entriesRaw === undefined || objectsRaw === undefined) return;
    let cancelled = false;
    void (async () => {
      entryIdxRef.current = historyIdx();
      if (editId) {
        const e = entriesRaw.find((x) => x.id === editId);
        if (e) {
          prefillFromEntry(e, true);
          navigate('?step=3', { replace: true, state: location.state });
        } else {
          reset({ date: todayStr() });
        }
      } else if (
        step !== 0 && draft.workTypeId !== '' && !draft.editId
        && draft.objectId === activeObject?.id
      ) {
        // Процесс убили посреди ввода (камера, звонок): черновик пережил
        // перезапуск в localStorage — продолжаем с того же шага. Черновик правки
        // или чужого объекта не восстанавливаем, чтобы не записать не туда.
        // Запись входа в историю была на step шагов раньше текущей
        entryIdxRef.current = Math.max(0, historyIdx() - step);
      } else {
        // Кто работал по умолчанию: сегодняшняя перекличка (читаем напрямую,
        // чтобы не поймать устаревшее значение хука), иначе участники прошлой записи
        const att = activeObject
          ? await db.attendance.where({ objectId: activeObject.id, date: todayStr() }).first()
          : undefined;
        if (cancelled) return;
        const fromAttendance = att?.workerIds ?? [];
        reset({
          objectId: activeObject?.id ?? '',
          date: todayStr(),
          workerIds: fromAttendance.length > 0 ? fromAttendance : (lastEntry ? lastEntry.shares.map((s) => s.workerId) : []),
        });
        if (step !== 0) navigate('?step=0', { replace: true });
      }
      setReady(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entriesRaw, objectsRaw, activeObject, ready]);

  const workType = workTypes.find((w) => w.id === draft.workTypeId);
  // Архивный бригадир остаётся в долях только при правке старой записи
  const selectedWorkers = workers.filter(
    (w) => draft.workerIds.includes(w.id) && (!w.archivedAt || Boolean(editId)),
  );

  // Фокус нампада всегда соответствует текущему шагу
  useEffect(() => {
    if (step === 1) {
      setFocus(draft.areaMode ? 'length' : 'quantity');
    } else if (step === 2 && draft.splitMode === 'manual') {
      setFocus(draft.workerIds[0] ? `manual:${draft.workerIds[0]}` : '');
    } else {
      setFocus('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function goStep(n: number) {
    navigate(`?step=${n}`, { state: location.state });
  }

  function back() {
    if (historyIdx() === 0) navigate('/', { replace: true });
    else navigate(-1);
  }

  async function pickWorkType(id: string) {
    const rate = activeObject ? await getRate(activeObject.id, id) : undefined;
    const customer = rate ? tyiynToSomsInput(rate.customerPrice) : '';
    const worker = rate ? tyiynToSomsInput(rate.workerPrice) : '';
    setRatePrices({ customer, worker });
    set({ workTypeId: id, customerPriceInput: customer, workerPriceInput: worker });
    goStep(1);
  }

  // Количество: из размеров или из нампада
  const quantity = draft.areaMode
    ? calcArea(parseDecimal(draft.lengthInput), parseDecimal(draft.heightInput), draft.openingInputs.map(parseDecimal))
    : parseDecimal(draft.quantityInput);

  const customerPrice = somsToTyiyn(draft.customerPriceInput);
  const workerPrice = somsToTyiyn(draft.workerPriceInput);
  const totals = lineTotals(quantity, customerPrice, workerPrice);
  const priceChanged = draft.customerPriceInput !== ratePrices.customer || draft.workerPriceInput !== ratePrices.worker;

  // Кому сколько
  const shares = useMemo(() => {
    if (draft.splitMode === 'manual') {
      return selectedWorkers.map((w) => {
        const amount = somsToTyiyn(draft.manualInputs[w.id] ?? '');
        return { workerId: w.id, weight: amount, amount };
      });
    }
    const weights = selectedWorkers.map((w) =>
      draft.splitMode === 'shifts' ? parseDecimal(draft.shiftInputs[w.id] ?? '1') : 1,
    );
    const amounts = splitShares(totals.workersTotal, weights);
    return selectedWorkers.map((w, i) => ({ workerId: w.id, weight: weights[i], amount: amounts[i] }));
  }, [selectedWorkers, draft.splitMode, draft.manualInputs, draft.shiftInputs, totals.workersTotal]);

  const manualSum = shares.reduce((s, x) => s + x.amount, 0);
  const manualRemainder = totals.workersTotal - manualSum;
  const manualInvalid = draft.splitMode === 'manual' && manualRemainder !== 0;
  // Правка живёт в объекте самой записи, даже если он уже закрыт
  const targetObjectId = isEdit ? editEntry!.objectId : activeObject?.id;
  const canSave = quantity > 0 && draft.workerIds.length > 0 && !manualInvalid && !!workType && !!targetObjectId;
  const savingRef = useRef(false);

  async function save() {
    if (!canSave || !workType || !targetObjectId || savingRef.current) return;
    savingRef.current = true;
    try {
    let note = draft.note.trim();
    if (draft.areaMode) {
      const dims = `${draft.lengthInput}×${draft.heightInput}${draft.openingInputs.length ? ` − ${draft.openingInputs.join(' − ')}` : ''} м²`;
      note = note ? `${dims}. ${note}` : dims;
    }
    const data = {
      objectId: targetObjectId,
      workTypeId: workType.id,
      date: draft.date || todayStr(),
      quantity,
      unit: workType.unit,
      customerPrice, workerPrice,
      customerTotal: totals.customerTotal,
      workersTotal: totals.workersTotal,
      shares,
      splitMode: draft.splitMode,
      note: note || undefined,
      photoIds: draft.photoIds,
      accepted: isEdit ? (editEntry?.accepted ?? false) : false,
      acceptedAt: isEdit ? editEntry?.acceptedAt : undefined,
      // Частичная приёмка переезжает в новую версию; принятый объём не больше нового
      ...(isEdit && editEntry?.acceptedQuantity !== undefined
        ? (() => {
          const acceptedQuantity = Math.min(editEntry.acceptedQuantity, quantity);
          return {
            acceptedQuantity,
            acceptedTotal: lineTotals(acceptedQuantity, customerPrice, 0).customerTotal,
            acceptNote: editEntry.acceptNote,
          };
        })()
        : {}),
    };
    const saved = isEdit
      ? await reviseWorkEntry(editId!, data)
      : await addWorkEntry(data);
    if (draft.rememberRate && priceChanged) {
      await upsertRate(targetObjectId, workType.id, customerPrice, workerPrice);
    }
    // Назад по иерархии: снимаем все шаги мастера (и устаревшую карточку при правке)
    const idx = historyIdx();
    const delta = idx - entryIdxRef.current + 1 + (isEdit ? 1 : 0);
    if (idx >= delta) navigate(-delta);
    else navigate('/', { replace: true });
    toast.show(t('common.saved'), () => hardDelete('workEntries', saved.id));
    // Черновик записан — очищаем, чтобы не всплыл при следующем входе
    reset();
    } finally {
      savingRef.current = false;
    }
  }

  const favorites = workTypes.filter((w) => w.isFavorite && !w.archivedAt);
  const others = workTypes.filter((w) => !w.isFavorite && !w.archivedAt);
  const visibleOthers = showAll ? others : others.slice(0, 6);

  // Значение активного поля нампада
  function focusValue(): string {
    if (focus === 'quantity') return draft.quantityInput;
    if (focus === 'length') return draft.lengthInput;
    if (focus === 'height') return draft.heightInput;
    if (focus === 'customerPrice') return draft.customerPriceInput;
    if (focus === 'workerPrice') return draft.workerPriceInput;
    if (focus.startsWith('opening')) return draft.openingInputs[Number(focus.slice(7))] ?? '';
    if (focus.startsWith('manual:')) return draft.manualInputs[focus.slice(7)] ?? '';
    return '';
  }

  function setFocusValue(v: string) {
    if (focus === 'quantity') set({ quantityInput: v });
    else if (focus === 'length') set({ lengthInput: v });
    else if (focus === 'height') set({ heightInput: v });
    else if (focus === 'customerPrice') set({ customerPriceInput: v });
    else if (focus === 'workerPrice') set({ workerPriceInput: v });
    else if (focus.startsWith('opening')) {
      const i = Number(focus.slice(7));
      const next = [...draft.openingInputs];
      next[i] = v;
      set({ openingInputs: next });
    } else if (focus.startsWith('manual:')) {
      set({ manualInputs: { ...draft.manualInputs, [focus.slice(7)]: v } });
    }
  }

  // Подпись активного поля для панели нампада
  function focusLabel(): string {
    if (focus === 'length') return t('wizard.length');
    if (focus === 'height') return t('wizard.height');
    if (focus.startsWith('opening')) return t('wizard.openings');
    if (focus === 'customerPrice') return t('wizard.customerPrice');
    if (focus === 'workerPrice') return t('wizard.workerPrice');
    if (focus.startsWith('manual:')) return workers.find((w) => w.id === focus.slice(7))?.name ?? '';
    return workType ? `${wtLabel(workType, lang)} · ${workType.unit}` : '';
  }

  function toggleWorker(id: string) {
    const removing = draft.workerIds.includes(id);
    const nextIds = removing ? draft.workerIds.filter((x) => x !== id) : [...draft.workerIds, id];
    set({ workerIds: nextIds });
    if (draft.splitMode === 'manual') {
      if (removing && focus === `manual:${id}`) setFocus(nextIds[0] ? `manual:${nextIds[0]}` : '');
      if (!removing && nextIds.length === 1) setFocus(`manual:${id}`);
    }
  }

  const chip = (active: boolean) =>
    `rounded-xl border px-3 py-2 text-[18px] min-h-[48px] ${
      active ? 'border-orange-500 bg-orange-50 font-semibold' : 'border-slate-300 bg-white'
    }`;

  const titles = [t('wizard.whatDone'), t('wizard.howMuch'), t('wizard.whoWorked'), t('wizard.check')];

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <ScreenHeader title={isEdit ? t('wizard.editTitle') : titles[step]} onBack={back} />
      <ProgressDots total={STEP_COUNT} current={step} />

      {/* Шаг 1: Что сделали? */}
      {step === 0 && (
        <div className="flex-1 px-4 pb-6">
          <div className="grid grid-cols-2 gap-3">
            {lastEntry && (
              <Tile
                icon="repeat"
                label={t('wizard.likeYesterday')}
                sub={wtLabel(workTypes.find((w) => w.id === lastEntry.workTypeId), lang)}
                onClick={() => { prefillFromEntry(lastEntry, false); goStep(3); }}
                testId="like-yesterday"
              />
            )}
            {favorites.map((w) => (
              <Tile key={w.id} icon={w.icon} label={wtLabel(w, lang)} sub={w.unit} onClick={() => void pickWorkType(w.id)} testId={`wt-${w.nameRu}`} />
            ))}
            {visibleOthers.map((w) => (
              <Tile key={w.id} icon={w.icon} label={wtLabel(w, lang)} sub={w.unit} onClick={() => void pickWorkType(w.id)} testId={`wt-${w.nameRu}`} />
            ))}
          </div>
          {!showAll && others.length > 6 && (
            <button className="mt-3 min-h-[56px] w-full rounded-2xl bg-slate-100 text-[18px]" onClick={() => setShowAll(true)}>
              {t('common.other')}
            </button>
          )}
        </div>
      )}

      {/* Шаг 2: Сколько? */}
      {step === 1 && workType && (
        <div className="flex flex-1 flex-col px-4">
          {workType.calc === 'area' && (
            <label className="flex min-h-[48px] items-center gap-2 text-[16px]">
              <input
                type="checkbox"
                className="h-6 w-6 accent-orange-500"
                checked={draft.areaMode}
                onChange={(e) => { set({ areaMode: e.target.checked }); setFocus(e.target.checked ? 'length' : 'quantity'); }}
              />
              {t('wizard.byDimensions')}
            </label>
          )}

          {draft.areaMode ? (
            <div className="mt-2">
              <div className="flex flex-wrap gap-2">
                <button className={chip(focus === 'length')} onClick={() => setFocus('length')}>
                  {t('wizard.length')}: {draft.lengthInput || '0'}
                </button>
                <button className={chip(focus === 'height')} onClick={() => setFocus('height')}>
                  {t('wizard.height')}: {draft.heightInput || '0'}
                </button>
                {draft.openingInputs.map((o, i) => (
                  <button key={i} className={chip(focus === `opening${i}`)} onClick={() => setFocus(`opening${i}`)}>
                    {t('wizard.openings')}: {o || '0'}
                  </button>
                ))}
                <button
                  className="min-h-[48px] rounded-xl bg-slate-100 px-3 text-[16px]"
                  onClick={() => { set({ openingInputs: [...draft.openingInputs, ''] }); setFocus(`opening${draft.openingInputs.length}`); }}
                >
                  {t('wizard.addOpening')}
                </button>
              </div>
              <p className="py-3 text-center text-[24px] font-bold">{t('wizard.area', { area: formatQuantity(quantity) })}</p>
            </div>
          ) : (
            <button className="w-full py-3 text-center" onClick={() => setFocus('quantity')} data-testid="quantity-display">
              <span className={`text-[36px] font-bold ${focus === 'quantity' ? 'text-orange-600' : ''}`}>
                {draft.quantityInput || '0'}
              </span>
              <span className="ml-2 text-[20px] text-slate-500">{workType.unit}</span>
            </button>
          )}

          {/* Цены за единицу из расценки объекта, редактируются */}
          <div className="mb-3 flex gap-2">
            <button className={`flex-1 ${chip(focus === 'customerPrice')}`} onClick={() => setFocus('customerPrice')} data-testid="customer-price">
              <span className="block text-[13px] text-slate-500">{t('wizard.customerPrice')} {t('wizard.perUnit', { unit: workType.unit })}</span>
              {draft.customerPriceInput || '0'}
            </button>
            <button className={`flex-1 ${chip(focus === 'workerPrice')}`} onClick={() => setFocus('workerPrice')} data-testid="worker-price">
              <span className="block text-[13px] text-slate-500">{t('wizard.workerPrice')} {t('wizard.perUnit', { unit: workType.unit })}</span>
              {draft.workerPriceInput || '0'}
            </button>
          </div>

          {priceChanged && (
            <label className="mb-2 flex min-h-[48px] items-center gap-2 text-[16px]">
              <input
                type="checkbox"
                className="h-6 w-6 accent-orange-500"
                checked={draft.rememberRate}
                onChange={(e) => set({ rememberRate: e.target.checked })}
              />
              {t('wizard.rememberRate')}
            </label>
          )}

          <NumPadPanel
            label={focusLabel()}
            value={focusValue()}
            onChange={setFocusValue}
            action={{ label: t('common.next'), onClick: () => goStep(2), disabled: quantity <= 0, testId: 'next-2' }}
          />
        </div>
      )}

      {/* Шаг 3: Кто работал? */}
      {step === 2 && (
        <div className="flex flex-1 flex-col px-4">
          <div className="grid grid-cols-2 gap-2">
            {workers.filter((w) => !w.archivedAt).map((w) => {
              const selected = draft.workerIds.includes(w.id);
              return (
                <button
                  key={w.id}
                  data-testid={`worker-${w.name}`}
                  className={`flex min-h-[64px] items-center gap-2 rounded-2xl px-3 shadow-card ${
                    selected ? 'bg-amber-50 ring-2 ring-accent' : 'bg-white'
                  }`}
                  onClick={() => toggleWorker(w.id)}
                >
                  <WorkerCircle worker={w} size={40} />
                  <span className="min-w-0 text-left">
                    <span className="block truncate text-[16px] font-semibold">{w.name}</span>
                    {w.headcount ? <span className="block text-[12px] font-medium text-slate-500">{t('workers.headcountShort', { n: w.headcount })}</span> : null}
                  </span>
                </button>
              );
            })}
          </div>

          {newWorkerName === null ? (
            <button className="mt-3 min-h-[56px] w-full rounded-2xl bg-slate-100 text-[18px]" onClick={() => setNewWorkerName('')} data-testid="add-worker">
              {t('wizard.addWorker')}
            </button>
          ) : (
            <div className="mt-3 flex gap-2">
              <input
                autoFocus
                data-testid="new-worker-name"
                className="min-h-[56px] flex-1 rounded-xl border border-slate-300 px-3 text-[18px]"
                placeholder={t('workers.name')}
                value={newWorkerName}
                onChange={(e) => setNewWorkerName(e.target.value)}
              />
              <button
                data-testid="new-worker-save"
                className="min-h-[56px] rounded-xl bg-orange-500 px-4 text-[18px] font-semibold text-white"
                onClick={() => {
                  const name = newWorkerName.trim();
                  if (!name) return;
                  void addWorker(name).then((w) => {
                    set({ workerIds: [...draft.workerIds, w.id] });
                    setNewWorkerName(null);
                  });
                }}
              >
                {t('common.add')}
              </button>
            </div>
          )}

          <div className="mt-4">
            <Segmented
              options={[
                { value: 'equal', label: t('wizard.splitEqual') },
                { value: 'shifts', label: t('wizard.splitShifts') },
                { value: 'manual', label: t('wizard.splitManual') },
              ]}
              value={draft.splitMode}
              onChange={(v) => {
                set({ splitMode: v });
                if (v === 'manual') setFocus(draft.workerIds[0] ? `manual:${draft.workerIds[0]}` : '');
                else setFocus('');
              }}
            />
          </div>

          {draft.splitMode === 'shifts' && (
            <div className="mt-3 flex flex-col gap-2">
              {selectedWorkers.map((w) => {
                const val = parseDecimal(draft.shiftInputs[w.id] ?? '1');
                return (
                  <div key={w.id} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2">
                    <span className="text-[16px]">{w.name}</span>
                    <span className="flex items-center gap-2">
                      <button
                        aria-label={t('common.erase')}
                        className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100"
                        onClick={() => set({ shiftInputs: { ...draft.shiftInputs, [w.id]: String(Math.max(0, val - 1)) } })}
                      ><Minus size={20} aria-hidden="true" /></button>
                      <span className="w-10 text-center text-[20px] font-semibold">{val}</span>
                      <button
                        aria-label={t('common.add')}
                        className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100"
                        onClick={() => set({ shiftInputs: { ...draft.shiftInputs, [w.id]: String(val + 1) } })}
                      ><Plus size={20} aria-hidden="true" /></button>
                      <span className="text-[14px] text-slate-500">{t('wizard.shifts')}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {draft.splitMode === 'manual' && selectedWorkers.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {selectedWorkers.map((w) => (
                <button key={w.id} className={`flex items-center justify-between ${chip(focus === `manual:${w.id}`)}`} onClick={() => setFocus(`manual:${w.id}`)}>
                  <span>{w.name}</span>
                  <span className="font-semibold">{draft.manualInputs[w.id] || '0'}</span>
                </button>
              ))}
            </div>
          )}

          {draft.splitMode === 'manual' && selectedWorkers.length > 0 ? (
            <NumPadPanel
              label={focusLabel()}
              value={focusValue()}
              onChange={setFocusValue}
              hint={
                <p className={`pb-2 text-center text-[15px] ${manualRemainder === 0 ? 'text-slate-500' : 'text-money-out font-semibold'}`}>
                  {t('wizard.remainder', { sum: formatMoney(manualRemainder) })}
                </p>
              }
              action={{ label: t('common.next'), onClick: () => goStep(3), disabled: draft.workerIds.length === 0, testId: 'next-3' }}
            />
          ) : (
            <div className="mt-auto pb-4 pt-3">
              <BigButton label={t('common.next')} disabled={draft.workerIds.length === 0} onClick={() => goStep(3)} testId="next-3" />
            </div>
          )}
        </div>
      )}

      {/* Шаг 4: Проверь */}
      {step === 3 && workType && (
        <div className="flex flex-1 flex-col gap-3 px-4 pb-6">
          <DatePick value={draft.date || todayStr()} onChange={(d) => set({ date: d })} />

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-[18px] font-semibold">
              {wtLabel(workType, lang)} · {formatQuantity(quantity)} {workType.unit}
            </p>
            <div className="mt-2 flex justify-between text-[16px]">
              <span className="text-slate-600">{t('wizard.customerTotal')}</span>
              <span className="font-semibold text-money-in">{formatMoney(totals.customerTotal)}</span>
            </div>
            <div className="flex justify-between text-[16px]">
              <span className="text-slate-600">{t('wizard.workersTotal')}</span>
              <span className="font-semibold text-money-out">{formatMoney(totals.workersTotal)}</span>
            </div>
            <div className="flex justify-between text-[16px]">
              <span className="text-slate-600">{t('wizard.diff')}</span>
              <span className="font-semibold">{formatMoney(totals.customerTotal - totals.workersTotal)}</span>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="pb-1 text-[14px] text-slate-500">{t('wizard.whoHowMuch')}</p>
            {shares.map((s) => {
              const w = workers.find((x) => x.id === s.workerId);
              return (
                <div key={s.workerId} className="flex justify-between py-1 text-[16px]">
                  <span>{w?.name}</span>
                  <span className="font-semibold">{formatMoney(s.amount)}</span>
                </div>
              );
            })}
          </div>

          <PhotoPicker photoIds={draft.photoIds} onChange={(ids) => set({ photoIds: ids })} label={t('common.photo')} />

          <textarea
            className="min-h-[64px] w-full rounded-2xl border border-slate-200 p-3 text-[18px]"
            placeholder={t('common.note')}
            value={draft.note}
            onChange={(e) => set({ note: e.target.value })}
          />

          <div className="mt-auto">
            {manualInvalid && (
              <p className="pb-2 text-center text-[15px] font-semibold text-money-out">
                {t('wizard.remainder', { sum: formatMoney(manualRemainder) })}
              </p>
            )}
            <BigButton label={t('common.save')} disabled={!canSave} onClick={() => void save()} testId="save-work" />
          </div>
        </div>
      )}
    </div>
  );
}
