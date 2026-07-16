import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { addEntries, loadEntries, updateEntry } from '../storage';
import { addMinutesToHm, datesInRange, isOnCall, todayIso } from '../utils/time';
import { useI18n } from '../i18n';
import type { EntryKind } from '../types';

const MAX_ONCALL_PERIOD_DAYS = 92;

export default function AddEntry() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const editing = id ? loadEntries().find((e) => e.id === id) : undefined;

  const [kind, setKind] = useState<EntryKind>(
    editing && isOnCall(editing) ? 'oncall' : 'overtime',
  );
  const [date, setDate] = useState(editing?.date ?? todayIso());
  const [dateTo, setDateTo] = useState(editing?.date ?? todayIso());
  const [hours, setHours] = useState(editing ? String(editing.hours) : '');
  const [minutes, setMinutes] = useState(editing ? String(editing.minutes) : '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  if (id && !editing) {
    return <Navigate to="/" replace />;
  }

  const oncall = kind === 'oncall';
  // A period only makes sense when creating; editing targets one specific day.
  const periodMode = oncall && !editing;

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
        setError(t('form.errInvalid'));
        return;
      }
      if (h === 0 && m === 0) {
        setError(t('form.errEmpty'));
        return;
      }
    }

    const common = { kind, note: note.trim() || undefined };

    if (editing) {
      updateEntry(editing.id, { ...common, date, hours: h, minutes: m });
      navigate(-1);
      return;
    }

    if (periodMode) {
      const days = datesInRange(date, dateTo);
      if (days.length === 0) {
        setError(t('form.errRange'));
        return;
      }
      if (days.length > MAX_ONCALL_PERIOD_DAYS) {
        setError(t('form.errRangeTooLong'));
        return;
      }
      addEntries(
        days.map((day) => ({
          id: crypto.randomUUID(),
          date: day,
          hours: 0,
          minutes: 0,
          ...common,
        })),
      );
    } else {
      addEntries([{ id: crypto.randomUUID(), date, hours: h, minutes: m, ...common }]);
    }
    navigate('/');
  }

  const title = editing
    ? oncall
      ? t('form.editOncall')
      : t('form.editEntry')
    : oncall
      ? t('form.newOncall')
      : t('form.newEntry');

  const dateInputClass =
    'mt-1 w-full bg-surface border border-surface2 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-accent';

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-magic">{title}</h1>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-muted text-sm"
        >
          {t('form.cancel')}
        </button>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        {!editing && (
          <div className="flex gap-2" role="radiogroup" aria-label="Type">
            {(
              [
                { value: 'overtime', labelKey: 'form.kindOvertime' },
                { value: 'oncall', labelKey: 'form.kindOncall' },
              ] as const
            ).map(({ value, labelKey }) => (
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
                {t(labelKey)}
              </button>
            ))}
          </div>
        )}

        {periodMode ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-muted">{t('form.from')}</span>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (e.target.value > dateTo) setDateTo(e.target.value);
                  setError(null);
                }}
                className={dateInputClass}
                required
              />
            </label>
            <label className="block">
              <span className="text-sm text-muted">{t('form.to')}</span>
              <input
                type="date"
                value={dateTo}
                min={date}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setError(null);
                }}
                className={dateInputClass}
                required
              />
            </label>
          </div>
        ) : (
          <label className="block">
            <span className="text-sm text-muted">{t('form.date')}</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={dateInputClass}
              required
            />
          </label>
        )}

        {!oncall && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm text-muted">{t('form.hours')}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={23}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="0"
                  className={`${dateInputClass} text-2xl`}
                />
              </label>
              <label className="block">
                <span className="text-sm text-muted">{t('form.minutes')}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={59}
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  placeholder="0"
                  className={`${dateInputClass} text-2xl`}
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
                aria-label={t('form.resetLabel')}
              >
                ↺
              </button>
            </div>
          </>
        )}

        {oncall && (
          <p className="text-sm text-muted bg-surface border border-surface2 rounded-lg px-3 py-2">
            {t('form.oncallHint')}
          </p>
        )}

        <label className="block">
          <span className="text-sm text-muted">{t('form.note')}</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className={`${dateInputClass} resize-none`}
            placeholder={t('form.notePlaceholder')}
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
          {t('form.save')}
        </button>
      </form>
    </div>
  );
}
