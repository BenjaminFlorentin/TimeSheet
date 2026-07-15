import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteEntry, loadEntries } from '../storage';
import {
  formatDuration,
  formatRatio,
  groupByMonth,
  ratioOverEight,
  totalMinutes,
} from '../utils/time';
import EntryCard from '../components/EntryCard';

export default function Details() {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const entries = loadEntries();
  const groups = groupByMonth(entries);
  const totalRatio = entries.reduce((sum, e) => sum + ratioOverEight(e), 0);
  const grandTotal = totalMinutes(entries);

  function handleDelete(id: string) {
    if (!confirm('Supprimer cette entrée ?')) return;
    deleteEntry(id);
    setTick((t) => t + 1);
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-6" key={tick}>
      <h1 className="text-2xl font-bold font-magic mb-6">Détails 📜</h1>

      <div className="bg-surface rounded-2xl p-4 border border-surface2 mb-6">
        <p className="text-sm text-muted uppercase tracking-wide">🧙 Total cumulé</p>
        <div className="flex items-baseline justify-between mt-2">
          <p className="text-2xl font-semibold">{formatDuration(grandTotal)}</p>
          <p className="text-lg font-medium text-accent2">
            {formatRatio(totalRatio)}
          </p>
        </div>
        <p className="text-xs text-muted mt-1">
          Chaque heure supp est divisée par 8 (1 journée = 1)
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="text-muted text-sm">Aucune entrée pour le moment.</p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => {
            const groupTotal = totalMinutes(group.entries);
            const groupRatio = group.entries.reduce(
              (sum, e) => sum + ratioOverEight(e),
              0,
            );
            return (
              <section key={group.key}>
                <div className="flex items-baseline justify-between mb-2">
                  <h2 className="text-sm uppercase tracking-wide text-muted capitalize">
                    {group.key}
                  </h2>
                  <span className="text-xs text-muted">
                    {formatDuration(groupTotal)} · {formatRatio(groupRatio)}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.entries.map((e) => (
                    <EntryCard
                      key={e.id}
                      entry={e}
                      showRatio
                      onEdit={(id) => navigate(`/edit/${id}`)}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
