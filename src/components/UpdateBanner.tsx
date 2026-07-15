import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { checkForUpdate, CURRENT_VERSION, openUpdate } from '../updates';

export default function UpdateBanner() {
  const [apkUrl, setApkUrl] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!isNative) return;
    // Automatic silent check on app launch; offline or API errors
    // simply leave the banner hidden.
    checkForUpdate().then((result) => {
      if (result.available && result.apkUrl) setApkUrl(result.apkUrl);
    });
  }, [isNative]);

  if (!isNative) return null;

  async function handleManualCheck() {
    setChecking(true);
    try {
      const result = await checkForUpdate();
      if (result.available && result.apkUrl) {
        setApkUrl(result.apkUrl);
      } else {
        alert('Application à jour ✓');
      }
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="mb-4">
      {apkUrl && (
        <div className="bg-accent/10 border border-accent/40 rounded-xl p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Mise à jour disponible</p>
            <p className="text-xs text-muted">
              Télécharge puis ouvre le fichier pour installer.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openUpdate(apkUrl)}
            className="px-3 py-2 text-sm font-medium bg-accent text-slate-900 rounded-lg shrink-0"
          >
            Télécharger
          </button>
        </div>
      )}
      {!apkUrl && (
        <button
          type="button"
          onClick={handleManualCheck}
          disabled={checking}
          className="text-xs text-muted underline underline-offset-2 disabled:opacity-50"
        >
          {checking ? 'Vérification…' : 'Vérifier les mises à jour'}
          <span className="no-underline"> · v{CURRENT_VERSION.slice(0, 7)}</span>
        </button>
      )}
    </div>
  );
}
