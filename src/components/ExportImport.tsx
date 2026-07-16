import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  buildXlsxAttachment,
  exportBackupJson,
  exportXlsxFile,
  exportXlsxMail,
  fallbackMailWithDownload,
  importJson,
  loadEntries,
  shareXlsxAttachmentSync,
} from '../storage';
import { filterByRange, monthRange, todayIso } from '../utils/time';
import { useI18n } from '../i18n';

type Props = {
  onImported: () => void;
};

type PreparedAttachment = { blob: Blob; filename: string; rangeKey: string };

export default function ExportImport({ onImported }: Props) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const preparedRef = useRef<PreparedAttachment | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const rangeInvalid = from !== '' && to !== '' && from > to;

  useEffect(() => {
    if (!panelOpen) return;
    function handleClickOutside(e: Event) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [panelOpen]);

  // Pre-generate the XLSX for the current range while the panel is open, so the
  // web Mail path can call navigator.share() without an await beforehand
  // (Chrome consumes the transient user activation on the first await).
  useEffect(() => {
    if (!panelOpen || rangeInvalid || !from || !to) return;
    const rangeKey = `${from}..${to}`;
    let cancelled = false;
    const filtered = filterByRange(loadEntries(), from, to);
    if (filtered.length === 0) {
      preparedRef.current = null;
      return;
    }
    buildXlsxAttachment(filtered)
      .then((prepared) => {
        if (!cancelled) preparedRef.current = { ...prepared, rangeKey };
      })
      .catch(() => {
        if (!cancelled) preparedRef.current = null;
      });
    return () => {
      cancelled = true;
    };
  }, [panelOpen, from, to, rangeInvalid]);

  function togglePanel() {
    const opening = !panelOpen;
    setPanelOpen(opening);
    if (opening) {
      preparedRef.current = null;
      const entries = loadEntries();
      if (entries.length === 0) {
        const today = todayIso();
        setFrom(today);
        setTo(today);
      } else {
        const dates = entries.map((e) => e.date).sort();
        setFrom(dates[0]);
        setTo(dates[dates.length - 1]);
      }
    }
  }

  function applyPreset(monthsBack: 0 | 1) {
    const now = new Date();
    const ref = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
    const range = monthRange(ref);
    setFrom(range.from);
    setTo(range.to);
  }

  function filteredEntries(): ReturnType<typeof loadEntries> | null {
    const filtered = filterByRange(loadEntries(), from, to);
    if (filtered.length === 0) {
      alert(t('export.emptyRange'));
      return null;
    }
    return filtered;
  }

  async function handleExportFile() {
    const filtered = filteredEntries();
    if (!filtered) return;
    setPanelOpen(false);
    try {
      await exportXlsxFile(filtered);
    } catch (err) {
      alert(t('export.failed', { msg: err instanceof Error ? err.message : String(err) }));
    }
  }

  async function handleExportMail() {
    const filtered = filteredEntries();
    if (!filtered) return;
    setPanelOpen(false);

    if (Capacitor.isNativePlatform()) {
      // Android APK: native EmailComposer Intent, no activation constraint.
      try {
        await exportXlsxMail(filtered);
      } catch (err) {
        alert(t('export.failed', { msg: err instanceof Error ? err.message : String(err) }));
      }
      return;
    }

    const prepared = preparedRef.current;
    const rangeKey = `${from}..${to}`;

    if (prepared && prepared.rangeKey === rangeKey) {
      preparedRef.current = null;
      // Synchronous share: no await before navigator.share() so the click's
      // user activation survives on Chrome.
      const attempt = shareXlsxAttachmentSync(prepared.blob, prepared.filename);
      if (attempt.shared && attempt.promise) {
        try {
          await attempt.promise;
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return;
        }
      }
      fallbackMailWithDownload(prepared.blob, prepared.filename);
      return;
    }

    try {
      const built = await buildXlsxAttachment(filtered);
      fallbackMailWithDownload(built.blob, built.filename);
    } catch (err) {
      alert(t('export.failed', { msg: err instanceof Error ? err.message : String(err) }));
    }
  }

  async function handleBackup() {
    setPanelOpen(false);
    try {
      await exportBackupJson();
    } catch (err) {
      if (err instanceof Error && /cancel/i.test(err.message)) return;
      alert(t('export.backupFailed', { msg: err instanceof Error ? err.message : String(err) }));
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm(t('export.importConfirm'))) {
      e.target.value = '';
      return;
    }
    try {
      await importJson(file);
      onImported();
      alert(t('export.importOk'));
    } catch (err) {
      alert(t('export.importFailed', { msg: err instanceof Error ? err.message : String(err) }));
    } finally {
      e.target.value = '';
    }
  }

  return (
    <div className="flex gap-2 items-start">
      <div className="relative" ref={panelRef}>
        <button
          type="button"
          onClick={togglePanel}
          className="px-3 py-1.5 text-xs bg-surface2 text-slate-100 rounded-full flex items-center gap-1"
          aria-haspopup="dialog"
          aria-expanded={panelOpen}
        >
          {t('export.button')}
          <span className="text-[10px]" aria-hidden>▾</span>
        </button>
        {panelOpen && (
          <div
            role="dialog"
            aria-label="Options d'export"
            className="absolute right-0 mt-1 w-64 bg-surface border border-surface2 rounded-xl shadow-lg p-3 z-10 space-y-3"
          >
            <p className="text-xs uppercase tracking-wide text-muted">{t('export.period')}</p>
            <label className="block">
              <span className="text-xs text-muted">{t('form.from')}</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-0.5 w-full bg-bg border border-surface2 rounded-lg px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted">{t('form.to')}</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-0.5 w-full bg-bg border border-surface2 rounded-lg px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-accent"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => applyPreset(0)}
                className="flex-1 px-2 py-1.5 text-xs bg-surface2 text-slate-100 rounded-lg"
              >
                {t('export.thisMonth')}
              </button>
              <button
                type="button"
                onClick={() => applyPreset(1)}
                className="flex-1 px-2 py-1.5 text-xs bg-surface2 text-slate-100 rounded-lg"
              >
                {t('export.lastMonth')}
              </button>
            </div>
            {rangeInvalid && (
              <p className="text-xs text-red-300">
                {t('export.errRange')}
              </p>
            )}
            <div className="flex gap-2 pt-1 border-t border-surface2">
              <button
                type="button"
                onClick={handleExportFile}
                disabled={rangeInvalid}
                className="flex-1 px-2 py-2 text-sm font-medium bg-accent text-slate-900 rounded-lg disabled:opacity-40"
              >
                {t('export.file')}
              </button>
              <button
                type="button"
                onClick={handleExportMail}
                disabled={rangeInvalid}
                className="flex-1 px-2 py-2 text-sm font-medium bg-accent2 text-slate-900 rounded-lg disabled:opacity-40"
              >
                {t('export.mail')}
              </button>
            </div>
            <button
              type="button"
              onClick={handleBackup}
              className="w-full px-2 py-1.5 text-xs text-muted bg-bg border border-surface2 rounded-lg"
            >
              {t('export.backup')}
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="px-3 py-1.5 text-xs bg-surface2 text-slate-100 rounded-full"
      >
        {t('export.import')}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={handleImport}
        className="hidden"
      />
    </div>
  );
}
