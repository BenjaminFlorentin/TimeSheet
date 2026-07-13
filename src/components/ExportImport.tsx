import { useRef } from 'react';
import { exportJson, importJson } from '../storage';

type Props = {
  onImported: () => void;
};

export default function ExportImport({ onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
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
    <div className="flex gap-2">
      <button
        type="button"
        onClick={exportJson}
        className="px-3 py-1.5 text-xs bg-surface2 text-slate-100 rounded-full"
      >
        Exporter
      </button>
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
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}
