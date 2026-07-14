import { useEffect, useRef, useState } from 'react';
import {
  buildXlsxAttachment,
  exportXlsxFile,
  fallbackMailWithDownload,
  importJson,
  shareXlsxAttachmentSync,
} from '../storage';

type Props = {
  onImported: () => void;
};

type PreparedAttachment = { blob: Blob; filename: string };

export default function ExportImport({ onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const preparedRef = useRef<PreparedAttachment | null>(null);
  const buildingRef = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: Event) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [menuOpen]);

  function toggleMenu() {
    const opening = !menuOpen;
    setMenuOpen(opening);
    if (opening) {
      // Kick off XLSX generation in the background while the user is choosing.
      // Purpose: when they tap "Mail", the blob is already ready and we can call
      // navigator.share() without any preceding await, preserving the transient
      // user activation that Chrome Android otherwise consumes on the first await.
      preparedRef.current = null;
      if (!buildingRef.current) {
        buildingRef.current = true;
        buildXlsxAttachment()
          .then((prepared) => {
            preparedRef.current = prepared;
          })
          .catch(() => {
            preparedRef.current = null;
          })
          .finally(() => {
            buildingRef.current = false;
          });
      }
    }
  }

  async function handleExportFile() {
    setMenuOpen(false);
    try {
      await exportXlsxFile();
    } catch (err) {
      alert(`Export échoué : ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function handleExportMail() {
    setMenuOpen(false);
    const prepared = preparedRef.current;

    if (prepared) {
      preparedRef.current = null;
      // Synchronous path: no await before share(), so Chrome Android keeps the
      // user activation from this click and doesn't throw NotAllowedError.
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

    // Blob not ready yet (user was very fast, or generation failed). Build it now
    // and use the download + mailto fallback — the await would break sharing anyway.
    try {
      const built = await buildXlsxAttachment();
      fallbackMailWithDownload(built.blob, built.filename);
    } catch (err) {
      alert(`Export échoué : ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Importer ce fichier remplacera toutes les entrées actuelles. Continuer ?')) {
      e.target.value = '';
      return;
    }
    try {
      await importJson(file);
      onImported();
      alert('Import réussi ✓');
    } catch (err) {
      alert(`Import échoué : ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      e.target.value = '';
    }
  }

  return (
    <div className="flex gap-2 items-start">
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={toggleMenu}
          className="px-3 py-1.5 text-xs bg-surface2 text-slate-100 rounded-full flex items-center gap-1"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          Exporter
          <span className="text-[10px]" aria-hidden>▾</span>
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 mt-1 w-32 bg-surface border border-surface2 rounded-lg shadow-lg overflow-hidden z-10"
          >
            <button
              type="button"
              role="menuitem"
              onClick={handleExportFile}
              className="w-full text-left px-3 py-2 text-sm text-slate-100 hover:bg-surface2 active:bg-surface2"
            >
              Fichier
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleExportMail}
              className="w-full text-left px-3 py-2 text-sm text-slate-100 hover:bg-surface2 active:bg-surface2"
            >
              Mail
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="px-3 py-1.5 text-xs bg-surface2 text-slate-100 rounded-full"
      >
        Importer
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
