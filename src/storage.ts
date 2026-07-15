import { Capacitor } from '@capacitor/core';
import { EmailComposer } from 'capacitor-email-composer';
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

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MAIL_SUBJECT = 'Export des heures supplémentaires';

export async function buildXlsxAttachment(): Promise<{
  blob: Blob;
  filename: string;
}> {
  const blob = await buildXlsxBlob();
  return { blob, filename: `timesheet-${todayStamp()}.xlsx` };
}

export function shareXlsxAttachmentSync(blob: Blob, filename: string): {
  shared: boolean;
  promise?: Promise<void>;
} {
  const file = new File([blob], filename, { type: XLSX_MIME });
  const canShareFile =
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] });
  if (!canShareFile) return { shared: false };
  return {
    shared: true,
    promise: navigator.share({ files: [file], title: MAIL_SUBJECT }),
  };
}

export function fallbackMailWithDownload(blob: Blob, filename: string): void {
  triggerDownload(blob, filename);
  alert(
    'Pièce jointe automatique non disponible ici. Le fichier a été téléchargé — joins-le manuellement à ton mail.',
  );
  window.location.href = `mailto:?subject=${encodeURIComponent(MAIL_SUBJECT)}`;
}

async function buildXlsxBlob(): Promise<Blob> {
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
  return workbook.toBlob();
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function exportXlsxFile(): Promise<void> {
  const blob = await buildXlsxBlob();
  triggerDownload(blob, `timesheet-${todayStamp()}.xlsx`);
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function exportXlsxMailNative(blob: Blob, filename: string): Promise<void> {
  const base64 = await blobToBase64(blob);
  await EmailComposer.open({
    subject: MAIL_SUBJECT,
    body: '',
    attachments: [
      {
        type: 'base64',
        path: base64,
        name: filename,
      },
    ],
  });
}

export async function exportXlsxMail(): Promise<void> {
  const { blob, filename } = await buildXlsxAttachment();

  if (Capacitor.isNativePlatform()) {
    await exportXlsxMailNative(blob, filename);
    return;
  }

  const attempt = shareXlsxAttachmentSync(blob, filename);
  if (attempt.shared && attempt.promise) {
    try {
      await attempt.promise;
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }
  fallbackMailWithDownload(blob, filename);
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
