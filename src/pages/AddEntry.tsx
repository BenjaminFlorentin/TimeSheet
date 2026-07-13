import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addEntry } from '../storage';
import { todayIso } from '../utils/time';

export default function AddEntry() {
  const navigate = useNavigate();
  const [date, setDate] = useState(todayIso());
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const h = parseInt(hours || '0', 10);
    const m = parseInt(minutes || '0', 10);
    if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || m < 0 || m > 59 || h > 23) {
      setError('Valeurs invalides. Heures 0–23, minutes 0–59.');
      return;
    }
    if (h === 0 && m === 0) {
      setError('Renseigne au moins une minute.');
      return;
    }
    addEntry({
      id: crypto.randomUUID(),
      date,
      hours: h,
      minutes: m,
      note: note.trim() || undefined,
    });
    navigate('/');
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Nouvelle entrée</h1>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-muted text-sm"
        >
          Annuler
        </button>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block">
          <span className="text-sm text-muted">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full bg-surface border border-surface2 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-accent"
            required
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-muted">Heures</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={23}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="0"
              className="mt-1 w-full bg-surface border border-surface2 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-accent text-2xl"
            />
          </label>
          <label className="block">
            <span className="text-sm text-muted">Minutes</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={59}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="0"
              className="mt-1 w-full bg-surface border border-surface2 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-accent text-2xl"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm text-muted">Note (optionnel)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="mt-1 w-full bg-surface border border-surface2 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-accent resize-none"
            placeholder="Contexte, projet, client…"
          />
        </label>

        {error && (
          <p className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg px-3 py-2 text-sm">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="w-full bg-accent text-slate-900 font-semibold rounded-lg py-3 active:scale-[0.98] transition"
        >
          Enregistrer
        </button>
      </form>
    </div>
  );
}
