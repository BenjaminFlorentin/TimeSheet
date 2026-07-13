import { Outlet } from 'react-router-dom';
import BottomNav from './components/BottomNav';

export default function App() {
  return (
    <div className="flex flex-col min-h-screen bg-bg text-slate-100">
      <main className="flex-1 pb-24 safe-top">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
