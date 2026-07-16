import { useState } from 'react';
import { Link } from 'react-router-dom';
import { loadEntries } from '../storage';
import {
  filterThisMonth,
  filterThisWeek,
  formatDuration,
  oncallOnly,
  overtimeOnly,
  sortByDateDesc,
  totalMinutes,
} from '../utils/time';
import SummaryCard from '../components/SummaryCard';
import EntryCard from '../components/EntryCard';
import ExportImport from '../components/ExportImport';
import UpdateBanner from '../components/UpdateBanner';
import { useI18n } from '../i18n';

export default function Summary() {
  const { t } = useI18n();
  const [tick, setTick] = useState(0);
  const entries = loadEntries();
  const weekTotal = totalMinutes(overtimeOnly(filterThisWeek(entries)));
  const monthTotal = totalMinutes(overtimeOnly(filterThisMonth(entries)));
  const oncallThisMonth = oncallOnly(filterThisMonth(entries)).length;
  const recent = sortByDateDesc(entries).slice(0, 3);

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-6">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold font-magic">{t('summary.title')}</h1>
        <ExportImport onImported={() => setTick((t) => t + 1)} />
      </header>

      <UpdateBanner />

      <div className="space-y-4">
        <SummaryCard
          title={t('summary.thisWeek')}
          value={formatDuration(weekTotal)}
          subtitle={t('summary.thisWeekSub')}
        />
        <SummaryCard
          title={t('summary.thisMonth')}
          value={formatDuration(monthTotal)}
          subtitle={t('summary.thisMonthSub')}
          accent="violet"
        />
        <SummaryCard
          title={t('summary.oncallMonth')}
          value={t(oncallThisMonth > 1 ? 'summary.daysPlural' : 'summary.days', {
            n: oncallThisMonth,
          })}
          subtitle={t('summary.oncallMonthSub')}
        />
      </div>

      <section className="mt-8">
        <h2 className="text-sm uppercase tracking-wide text-muted mb-3">
          {t('summary.recent')}
        </h2>
        {recent.length === 0 ? (
          <p className="text-muted text-sm">{t('summary.empty')}</p>
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
        aria-label={t('summary.addLabel')}
      >
        🪄
      </Link>
    </div>
  );
}
