import { useState } from 'react';
import { Link } from 'react-router-dom';
import { loadEntries } from '../storage';
import {
  filterThisMonth,
  filterThisWeek,
  formatDuration,
  sortByDateDesc,
  totalMinutes,
} from '../utils/time';
import SummaryCard from '../components/SummaryCard';
import EntryCard from '../components/EntryCard';
import ExportImport from '../components/ExportImport';
import UpdateBanner from '../components/UpdateBanner';

export default function Summary() {
  const [tick, setTick] = useState(0);
  const entries = loadEntries();
  const weekTotal = totalMinutes(filterThisWeek(entries));
  const monthTotal = totalMinutes(filterThisMonth(entries));
  const recent = sortByDateDesc(entries).slice(0, 3);

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-6">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold font-magic">TimeSheet ⚡</h1>
        <ExportImport onImported={() => setTick((t) => t + 1)} />
      </header>

      <UpdateBanner />

      <div className="space-y-4">
        <SummaryCard
          title="Cette semaine"
          value={formatDuration(weekTotal)}
          subtitle="Heures supp saisies cette semaine"
        />
        <SummaryCard
          title="Ce mois"
          value={formatDuration(monthTotal)}
          subtitle="Heures supp saisies ce mois"
          accent="violet"
        />
      </div>

      <section className="mt-8">
        <h2 className="text-sm uppercase tracking-wide text-muted mb-3">
          📜 Derniers enchantements
        </h2>
        {recent.length === 0 ? (
          <p className="text-muted text-sm">
            Aucun sortilège lancé. <em>Accio</em> heures supp ! 🪄
          </p>
        ) : (
          <div className="space-y-2">
            {recent.map((e) => (
              <EntryCard key={e.id + tick} entry={e} showRatio />
            ))}
          </div>
        )}
      </section>

      <Link
        to="/add"
        className="fixed right-6 bottom-24 bg-accent text-slate-900 rounded-full w-14 h-14 flex items-center justify-center text-2xl shadow-lg shadow-accent/30 active:scale-95 transition"
        aria-label="Ajouter une entrée"
      >
        🪄
      </Link>
    </div>
  );
}
