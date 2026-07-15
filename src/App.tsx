import { Outlet } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import SnitchIntro from './components/SnitchIntro';

export default function App() {
  return (
    <div className="flex flex-col min-h-screen starry-night text-slate-100">
      <SnitchIntro />
      <main className="flex-1 pb-24 safe-top">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
