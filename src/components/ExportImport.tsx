import { useEffect, useRef, useState } from 'react';
import { exportCsvMail, exportXlsxFile, importJson } from '../storage';

type Props = {
  onImported: () => void;
};

export default function ExportImport({ onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
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

  async function handleExportFile() {
    setMenuOpen(false);
    try {
      await exportXlsxFile();
    } catch (err) {
      alert(`Export échoué : ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function handleExportMail() {
    exportCsvMail();
    setMenuOpen(false);
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
          onClick={() => setMenuOpen((v) => !v)}
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
