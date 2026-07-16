import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { addEntry, loadEntries, updateEntry } from '../storage';
import { addMinutesToHm, isOnCall, todayIso } from '../utils/time';
import type { EntryKind } from '../types';

export default function AddEntry() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const editing = id ? loadEntries().find((e) => e.id === id) : undefined;

  const [kind, setKind] = useState<EntryKind>(
    editing && isOnCall(editing) ? 'oncall' : 'overtime',
  );
  const [date, setDate] = useState(editing?.date ?? todayIso());
  const [hours, setHours] = useState(editing ? String(editing.hours) : '');
  const [minutes, setMinutes] = useState(editing ? String(editing.minutes) : '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  if (id && !editing) {
    return <Navigate to="/" replace />;
  }

  const oncall = kind === 'oncall';

  function quickAdd(delta: number) {
    const h = parseInt(hours || '0', 10) || 0;
    const m = parseInt(minutes || '0', 10) || 0;
    const next = addMinutesToHm(h, m, delta);
    setHours(String(next.hours));
    setMinutes(String(next.minutes));
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let h = 0;
    let m = 0;
    if (!oncall) {
      h = parseInt(hours || '0', 10);
      m = parseInt(minutes || '0', 10);
      if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || m < 0 || m > 59 || h > 23) {
        setError('Valeurs invalides. Heures 0–23, minutes 0–59.');
        return;
      }
      if (h === 0 && m === 0) {
        setError('Renseigne au moins une minute.');
        return;
      }
    }
    const values = {
      date,
      hours: h,
      minutes: m,
      kind,
      note: note.trim() || undefined,
    };
    if (editing) {
      updateEntry(editing.id, values);
      navigate(-1);
    } else {
      addEntry({ id: crypto.randomUUID(), ...values });
      navigate('/');
    }
  }

  const title = editing
    ? oncall
      ? "Modifier l'astreinte ✨"
      : "Modifier l'entrée ✨"
    : oncall
      ? 'Nouvelle astreinte 🛡️'
      : 'Nouvelle entrée 🪄';

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-magic">{title}</h1>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-muted text-sm"
        >
          Annuler
        </button>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex gap-2" role="radiogroup" aria-label="Type d'entrée">
          {(
            [
              { value: 'overtime', label: '⚡ Heure supp' },
              { value: 'oncall', label: '🛡️ Astreinte' },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={kind === value}
              onClick={() => {
                setKind(value);
                setError(null);
              }}
              className={`flex-1 px-2 py-2 text-sm rounded-lg border transition ${
                kind === value
                  ? 'bg-accent text-slate-900 border-accent font-medium'
                  : 'bg-surface text-slate-100 border-surface2'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

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

        {!oncall && (
        <>
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

        <div className="flex gap-2">
          {[
            { label: '+15min', delta: 15 },
            { label: '+30min', delta: 30 },
            { label: '+1h', delta: 60 },
          ].map(({ label, delta }) => (
            <button
              key={label}
              type="button"
              onClick={() => quickAdd(delta)}
              className="flex-1 px-2 py-2 text-sm bg-surface2 text-slate-100 rounded-lg active:scale-95 transition"
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setHours('');
              setMinutes('');
            }}
            className="px-3 py-2 text-sm text-muted bg-surface rounded-lg border border-surface2"
            aria-label="Réinitialiser la durée"
          >
            ↺
          </button>
        </div>
        </>
        )}

        {oncall && (
          <p className="text-sm text-muted bg-surface border border-surface2 rounded-lg px-3 py-2">
            🛡️ Un jour d'astreinte compte pour 1 jour — pas de durée à saisir.
          </p>
        )}

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
