import writeXlsxFile from 'write-excel-file/browser';
import type { Entry } from './types';
import { formatRatio, parseIsoDate, ratioOverEight } from './utils/time';

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

const HEADERS = ['Year', 'Month', 'Day', 'Extra Hour', 'Extra Hour (/8)'];

type Row = {
  year: string;
  month: string;
  day: string;
  extraHour: string;
  extraHourRatio: string;
};

function buildRows(entries: Entry[]): Row[] {
  const sorted = [...entries].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
  return sorted.map((e) => {
    const d = parseIsoDate(e.date);
    return {
      year: d.getFullYear().toString(),
      month: d.toLocaleString('en-US', { month: 'long' }),
      day: String(d.getDate()).padStart(2, '0'),
      extraHour: (e.hours + e.minutes / 60).toFixed(2),
      extraHourRatio: formatRatio(ratioOverEight(e)),
    };
  });
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateFr(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export async function exportXlsxFile(): Promise<void> {
  const rows = buildRows(loadEntries());
  const headerRow = HEADERS.map((label) => ({
    value: label,
    fontWeight: 'bold' as const,
    align: 'center' as const,
    alignVertical: 'center' as const,
    wrap: true,
  }));
  const dataRows = rows.map((r) =>
    [r.year, r.month, r.day, r.extraHour, r.extraHourRatio].map((v) => ({
      value: v,
      align: 'left' as const,
    })),
  );
  const workbook = await writeXlsxFile([headerRow, ...dataRows], {
    sheet: 'TimeSheet',
    columns: [
      { width: 8 },
      { width: 14 },
      { width: 6 },
      { width: 14 },
      { width: 18 },
    ],
  });
  await workbook.toFile(`timesheet-${todayStamp()}.xlsx`);
}

export function exportCsvMail(): void {
  const rows = buildRows(loadEntries());
  const csvBody = [
    HEADERS.join(';'),
    ...rows.map((r) =>
      [r.year, r.month, r.day, r.extraHour, r.extraHourRatio].join(';'),
    ),
  ].join('\r\n');
  const subject = `TimeSheet - Export du ${formatDateFr(new Date())}`;
  const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(csvBody)}`;
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
