import type { Entry, ExportPayload } from './types';

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

export function exportJson(): void {
  const payload: ExportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: loadEntries(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `timesheet-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
