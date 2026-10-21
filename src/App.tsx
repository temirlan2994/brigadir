import { useEffect, useState } from 'react';
import { HashRouter, Outlet, Route, Routes } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import { ensureSeeded } from './db/seed';
import { useLangStore } from './i18n';
import { BottomNav } from './components/BottomNav';
import { Toast } from './components/Toast';
import { UpdateBanner } from './components/UpdateBanner';
import { Home } from './screens/Home';
import { WorkWizard } from './screens/WorkWizard';
import { PayoutNew } from './screens/PayoutNew';
import { ExpenseNew } from './screens/ExpenseNew';
import { ReceiptNew } from './screens/ReceiptNew';
import { AcceptWorks } from './screens/AcceptWorks';
import { AdjustmentNew } from './screens/AdjustmentNew';
import { Workers } from './screens/Workers';
import { WorkerCard } from './screens/WorkerCard';
import { Works } from './screens/Works';
import { WorkEntryCard } from './screens/WorkEntryCard';
import { RecordCard } from './screens/RecordCard';
import { Money } from './screens/Money';
import { SettingsScreen } from './screens/SettingsScreen';
import { ActPrint } from './screens/ActPrint';
import { Details } from './screens/Details';

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
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-slate-50 shadow-xl print-page">
        <Routes>
          <Route element={<TabLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/works" element={<Works />} />
            <Route path="/workers" element={<Workers />} />
            <Route path="/money" element={<Money />} />
          </Route>
          <Route path="/work/new" element={<WorkWizard />} />
          <Route path="/payout/new" element={<PayoutNew />} />
          <Route path="/expense/new" element={<ExpenseNew />} />
          <Route path="/receipt/new" element={<ReceiptNew />} />
          <Route path="/accept" element={<AcceptWorks />} />
          <Route path="/adjustment/new" element={<AdjustmentNew />} />
          <Route path="/workers/:id" element={<WorkerCard />} />
          <Route path="/works/:id" element={<WorkEntryCard />} />
          <Route path="/record/:table/:id" element={<RecordCard />} />
          <Route path="/details/:metric" element={<Details />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/act" element={<ActPrint />} />
        </Routes>
        <Toast />
        <UpdateBanner />
      </div>
    </HashRouter>
  );
}
