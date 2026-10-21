import { useEffect, useState } from 'react';
import { HashRouter, Outlet, Route, Routes } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import { ensureSeeded } from './db/seed';
import { useLangStore } from './i18n';
import { BottomNav } from './components/BottomNav';
import { Toast } from './components/Toast';
import { UpdateBanner } from './components/UpdateBanner';
import { Today } from './screens/Today';
import { Objects } from './screens/Objects';
import { NewObjectWizard } from './screens/NewObjectWizard';
import { ObjectScreen } from './screens/ObjectScreen';
import { ObjectWorks } from './screens/ObjectWorks';
import { Handover } from './screens/Handover';
import { CustomerMoney } from './screens/CustomerMoney';
import { ObjectPrices } from './screens/ObjectPrices';
import { ObjectResult } from './screens/ObjectResult';
import { CloseObject } from './screens/CloseObject';
import { Team } from './screens/Team';
import { WorkerCard } from './screens/WorkerCard';
import { Cash } from './screens/Cash';
import { CashMoveNew } from './screens/CashMoveNew';
import { AttendanceToday } from './screens/AttendanceToday';
import { WorkWizard } from './screens/WorkWizard';
import { PayoutNew } from './screens/PayoutNew';
import { ExpenseNew } from './screens/ExpenseNew';
import { ReceiptNew } from './screens/ReceiptNew';
import { AdjustmentNew } from './screens/AdjustmentNew';
import { WorkEntryCard } from './screens/WorkEntryCard';
import { RecordCard } from './screens/RecordCard';
import { SettingsScreen } from './screens/SettingsScreen';
import { ActPrint } from './screens/ActPrint';

// Вкладки с нижней навигацией
function TabLayout() {
  return (
    <>
      <div className="pb-24">
        <Outlet />
      </div>
      <BottomNav />
    </>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const setLang = useLangStore((s) => s.setLang);
  const settings = useLiveQuery(() => db.settings.get('main'), []);

  useEffect(() => {
    void ensureSeeded().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (settings) setLang(settings.lang);
  }, [settings, setLang]);

  if (!ready) return null;

  return (
    <HashRouter>
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-paper shadow-xl print-page">
        <Routes>
          <Route element={<TabLayout />}>
            <Route path="/" element={<Today />} />
            <Route path="/objects" element={<Objects />} />
            <Route path="/team" element={<Team />} />
            <Route path="/cash" element={<Cash />} />
          </Route>
          <Route path="/objects/new" element={<NewObjectWizard />} />
          <Route path="/objects/:id" element={<ObjectScreen />} />
          <Route path="/objects/:id/works" element={<ObjectWorks />} />
          <Route path="/objects/:id/handover" element={<Handover />} />
          <Route path="/objects/:id/money" element={<CustomerMoney />} />
          <Route path="/objects/:id/prices" element={<ObjectPrices />} />
          <Route path="/objects/:id/result" element={<ObjectResult />} />
          <Route path="/objects/:id/close" element={<CloseObject />} />
          <Route path="/team/:id" element={<WorkerCard />} />
          <Route path="/cashmove/new" element={<CashMoveNew />} />
          <Route path="/attendance" element={<AttendanceToday />} />
          <Route path="/work/new" element={<WorkWizard />} />
          <Route path="/payout/new" element={<PayoutNew />} />
          <Route path="/expense/new" element={<ExpenseNew />} />
          <Route path="/receipt/new" element={<ReceiptNew />} />
          <Route path="/adjustment/new" element={<AdjustmentNew />} />
          <Route path="/works/:id" element={<WorkEntryCard />} />
          <Route path="/record/:table/:id" element={<RecordCard />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/act" element={<ActPrint />} />
        </Routes>
        <Toast />
        <UpdateBanner />
      </div>
    </HashRouter>
  );
}
