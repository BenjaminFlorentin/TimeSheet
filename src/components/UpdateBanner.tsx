import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { checkForUpdate, CURRENT_VERSION, openUpdate } from '../updates';

const SHORT_VERSION = CURRENT_VERSION.slice(0, 7);

export default function UpdateBanner() {
  const [apkUrl, setApkUrl] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [downloadPct, setDownloadPct] = useState<number | null>(null);

  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!isNative) return;

    // Silent check on launch, and again every time the app comes back to the
    // foreground — Android keeps the WebView alive in recents, so a plain
    // on-mount check would miss releases published while the app was
    // backgrounded.
    function silentCheck() {
      checkForUpdate().then((result) => {
        if (result.available && result.apkUrl) setApkUrl(result.apkUrl);
      });
    }

    silentCheck();
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') silentCheck();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [isNative]);

  async function handleManualCheck() {
    setChecking(true);
    try {
      const result = await checkForUpdate();
      if (result.available && result.apkUrl) {
        setApkUrl(result.apkUrl);
      } else if (result.latestVersion) {
        alert(`Application à jour ✓ (version ${SHORT_VERSION})`);
      } else {
        alert(
          'Vérification impossible — connexion internet indisponible ou GitHub inaccessible.',
        );
      }
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="mb-4 space-y-2">
      {isNative && apkUrl && (
        <div className="bg-accent/10 border border-accent/40 rounded-xl p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              Un hibou t'apporte une mise à jour 🦉
            </p>
            <p className="text-xs text-muted">
              Télécharge puis ouvre le fichier pour installer.
            </p>
          </div>
          <button
            type="button"
            disabled={downloadPct !== null}
            onClick={async () => {
              setDownloadPct(0);
              try {
                await openUpdate(apkUrl, (pct) => setDownloadPct(pct));
              } catch (err) {
                alert(
                  `Mise à jour échouée : ${err instanceof Error ? err.message : String(err)}`,
                );
              } finally {
                setDownloadPct(null);
              }
            }}
            className="px-3 py-2 text-sm font-medium bg-accent text-slate-900 rounded-lg shrink-0 disabled:opacity-60"
          >
            {downloadPct === null
              ? 'Télécharger'
              : downloadPct < 100
                ? `${downloadPct} %`
                : 'Ouverture…'}
          </button>
        </div>
      )}
      <div className="flex items-center gap-2 text-xs text-muted">
        <span>Version {SHORT_VERSION}</span>
        {isNative && (
          <>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={handleManualCheck}
              disabled={checking}
              className="underline underline-offset-2 disabled:opacity-50"
            >
              {checking ? 'Vérification…' : 'Vérifier les mises à jour'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
