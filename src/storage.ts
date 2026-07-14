import type { Entry } from './types';
import {
  entryMinutes,
  formatDuration,
  formatRatio,
  parseIsoDate,
  ratioOverEight,
} from './utils/time';

const STORAGE_KEY = 'timesheet.entries';

export function loadEntries(): Entry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry);
  } catch {
    return [];
  }
}

export function saveEntries(entries: Entry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function addEntry(entry: Entry): Entry[] {
  const entries = [...loadEntries(), entry];
  saveEntries(entries);
  return entries;
}

export function deleteEntry(id: string): Entry[] {
  const entries = loadEntries().filter((e) => e.id !== id);
  saveEntries(entries);
  return entries;
}

const CSV_HEADER = ['année', 'mois', 'jour', 'heure supp', 'heure supp /8'];

function buildCsv(entries: Entry[]): string {
  const sorted = [...entries].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
  const rows = sorted.map((e) => {
    const d = parseIsoDate(e.date);
    return [
      d.getFullYear().toString(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
      formatDuration(entryMinutes(e)),
      formatRatio(ratioOverEight(e)),
    ].join(';');
  });
  return [CSV_HEADER.join(';'), ...rows].join('\r\n');
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateFr(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function exportCsvFile(): void {
  const csv = buildCsv(loadEntries());
  const withBom = '﻿' + csv;
  const blob = new Blob([withBom], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `timesheet-${todayStamp()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportCsvMail(): void {
  const csv = buildCsv(loadEntries());
  const subject = `TimeSheet - Export du ${formatDateFr(new Date())}`;
  const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(csv)}`;
  window.location.href = href;
}

export async function importJson(file: File): Promise<Entry[]> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const entries = Array.isArray(parsed?.entries) ? parsed.entries : parsed;
  if (!Array.isArray(entries)) {
    throw new Error('Format JSON invalide');
  }
  const valid = entries.filter(isEntry);
  saveEntries(valid);
  return valid;
}

function isEntry(v: unknown): v is Entry {
  if (!v || typeof v !== 'object') return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.date === 'string' &&
    typeof e.hours === 'number' &&
    typeof e.minutes === 'number'
  );
}
