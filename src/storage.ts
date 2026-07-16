import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { EmailComposer } from 'capacitor-email-composer';
import writeXlsxFile from 'write-excel-file/browser';
import type { Entry, ExportPayload } from './types';
import {
  formatRatio,
  oncallOnly,
  overtimeOnly,
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
  return addEntries([entry]);
}

export function addEntries(newEntries: Entry[]): Entry[] {
  const entries = [...loadEntries(), ...newEntries];
  saveEntries(entries);
  return entries;
}

export function deleteEntry(id: string): Entry[] {
  const entries = loadEntries().filter((e) => e.id !== id);
  saveEntries(entries);
  return entries;
}

export function updateEntry(
  id: string,
  patch: Partial<Omit<Entry, 'id'>>,
): Entry[] {
  const entries = loadEntries().map((e) =>
    e.id === id ? { ...e, ...patch } : e,
  );
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

function dateParts(e: Entry): { year: string; month: string; day: string } {
  const d = parseIsoDate(e.date);
  return {
    year: d.getFullYear().toString(),
    month: d.toLocaleString('en-US', { month: 'long' }),
    day: String(d.getDate()).padStart(2, '0'),
  };
}

function sortByDateAsc(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
}

export function buildRows(entries: Entry[]): Row[] {
  return sortByDateAsc(overtimeOnly(entries)).map((e) => ({
    ...dateParts(e),
    extraHour: (e.hours + e.minutes / 60).toFixed(2),
    extraHourRatio: formatRatio(ratioOverEight(e)),
  }));
}

export function buildOnCallRows(
  entries: Entry[],
): Array<{ year: string; month: string; day: string }> {
  return sortByDateAsc(oncallOnly(entries)).map(dateParts);
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MAIL_SUBJECT = 'Export des heures supplémentaires';

export async function buildXlsxAttachment(entries?: Entry[]): Promise<{
  blob: Blob;
  filename: string;
}> {
  const blob = await buildXlsxBlob(entries);
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

const ONCALL_HEADERS = ['Year', 'Month', 'Day'];

function headerCells(labels: string[]) {
  return labels.map((label) => ({
    value: label,
    fontWeight: 'bold' as const,
    align: 'center' as const,
    alignVertical: 'center' as const,
    wrap: true,
  }));
}

function bodyCells(values: string[]) {
  return values.map((v) => ({ value: v, align: 'left' as const }));
}

async function buildXlsxBlob(entries?: Entry[]): Promise<Blob> {
  const source = entries ?? loadEntries();
  const overtimeSheet = [
    headerCells(HEADERS),
    ...buildRows(source).map((r) =>
      bodyCells([r.year, r.month, r.day, r.extraHour, r.extraHourRatio]),
    ),
  ];
  const oncallSheet = [
    headerCells(ONCALL_HEADERS),
    ...buildOnCallRows(source).map((r) => bodyCells([r.year, r.month, r.day])),
  ];
  const workbook = await writeXlsxFile([
    {
      data: overtimeSheet,
      sheet: 'TimeSheet',
      columns: [
        { width: 8 },
        { width: 14 },
        { width: 6 },
        { width: 14 },
        { width: 18 },
      ],
    },
    {
      data: oncallSheet,
      sheet: 'On-call',
      columns: [{ width: 8 }, { width: 14 }, { width: 6 }],
    },
  ]);
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

export async function exportXlsxFile(entries?: Entry[]): Promise<void> {
  const blob = await buildXlsxBlob(entries);
  const filename = `timesheet-${todayStamp()}.xlsx`;

  if (Capacitor.isNativePlatform()) {
    // The Capacitor WebView silently ignores <a download> blobs; write the
    // file to the app cache and hand it to the native share sheet instead.
    // No `encoding` option: its absence tells Filesystem the data is base64,
    // which is required for a binary XLSX (the JSON backup passes UTF8).
    const base64 = await blobToBase64(blob);
    const written = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Cache,
    });
    await Share.share({ title: filename, files: [written.uri] });
    return;
  }

  triggerDownload(blob, filename);
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

export async function exportXlsxMail(entries?: Entry[]): Promise<void> {
  const { blob, filename } = await buildXlsxAttachment(entries);

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

export function buildBackupPayload(): ExportPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: loadEntries(),
  };
}

export async function exportBackupJson(): Promise<void> {
  const payload = buildBackupPayload();
  const json = JSON.stringify(payload, null, 2);
  const filename = `timesheet-backup-${todayStamp()}.json`;

  if (Capacitor.isNativePlatform()) {
    // The Capacitor WebView can't handle <a download> blobs; write the file
    // to the app cache and hand it to the native share sheet so the user can
    // save it to Files, Drive, etc.
    const written = await Filesystem.writeFile({
      path: filename,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({
      title: 'Sauvegarde TimeSheet',
      files: [written.uri],
    });
    return;
  }

  const blob = new Blob([json], { type: 'application/json' });
  triggerDownload(blob, filename);
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
