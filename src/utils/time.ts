import type { Entry } from '../types';

export function totalMinutes(entries: Entry[]): number {
  return entries.reduce((sum, e) => sum + e.hours * 60 + e.minutes, 0);
}

export function entryMinutes(entry: Entry): number {
  return entry.hours * 60 + entry.minutes;
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${String(m).padStart(2, '0')}min`;
}

export function ratioOverEight(entry: Entry): number {
  return (entry.hours + entry.minutes / 60) / 8;
}

export function formatPercent(ratio: number): string {
  const percent = ratio * 100;
  const rounded = Math.round(percent * 100) / 100;
  return `${rounded.toString().replace('.', ',')}%`;
}

export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const offset = (day + 6) % 7;
  const s = new Date(d);
  s.setDate(d.getDate() - offset);
  s.setHours(0, 0, 0, 0);
  return s;
}

export function filterThisWeek(entries: Entry[], now = new Date()): Entry[] {
  const start = startOfWeek(now);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return entries.filter((e) => {
    const d = parseIsoDate(e.date);
    return d >= start && d < end;
  });
}

export function filterThisMonth(entries: Entry[], now = new Date()): Entry[] {
  const y = now.getFullYear();
  const m = now.getMonth();
  return entries.filter((e) => {
    const d = parseIsoDate(e.date);
    return d.getFullYear() === y && d.getMonth() === m;
  });
}

export function formatLongDate(iso: string): string {
  const d = parseIsoDate(iso);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function formatMonthKey(iso: string): string {
  const d = parseIsoDate(iso);
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export function sortByDateDesc(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function groupByMonth(entries: Entry[]): Array<{ key: string; entries: Entry[] }> {
  const sorted = sortByDateDesc(entries);
  const groups = new Map<string, Entry[]>();
  for (const e of sorted) {
    const d = parseIsoDate(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  return Array.from(groups.entries()).map(([, arr]) => ({
    key: formatMonthKey(arr[0].date),
    entries: arr,
  }));
}
