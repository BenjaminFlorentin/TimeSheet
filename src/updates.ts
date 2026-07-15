import { Browser } from '@capacitor/browser';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';

export const CURRENT_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

const RELEASE_API =
  'https://api.github.com/repos/BenjaminFlorentin/TimeSheet/releases/latest';

export type UpdateCheck = {
  available: boolean;
  apkUrl?: string;
  latestVersion?: string;
};

export function parseReleaseVersion(body: string): string | null {
  const match = /version:\s*([0-9a-f]{7,40})/i.exec(body);
  return match ? match[1] : null;
}

export async function checkForUpdate(): Promise<UpdateCheck> {
  try {
    const res = await fetch(RELEASE_API, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return { available: false };
    const release = (await res.json()) as {
      body?: string;
      assets?: Array<{ name: string; browser_download_url: string }>;
    };
    const latestVersion = parseReleaseVersion(release.body ?? '');
    if (!latestVersion) return { available: false };
    const apk = release.assets?.find((a) => a.name === 'TimeSheet.apk');
    if (!apk) return { available: false };
    // A dev build ('dev') never claims an update; only a real CI-stamped
    // version that differs from the published one does.
    const available =
      CURRENT_VERSION !== 'dev' && !latestVersion.startsWith(CURRENT_VERSION) &&
      !CURRENT_VERSION.startsWith(latestVersion);
    return { available, apkUrl: apk.browser_download_url, latestVersion };
  } catch {
    return { available: false };
  }
}

export async function openUpdate(
  apkUrl: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  // Download natively (no Chrome — its Custom Tab APK downloads can hang at
  // 100%) then hand the file straight to the Android package installer.
  try {
    let listener: { remove: () => Promise<void> } | undefined;
    if (onProgress) {
      listener = await Filesystem.addListener('progress', (p) => {
        if (p.contentLength > 0) {
          onProgress(Math.round((p.bytes / p.contentLength) * 100));
        }
      });
    }
    try {
      const result = await Filesystem.downloadFile({
        url: apkUrl,
        path: 'TimeSheet-update.apk',
        directory: Directory.Cache,
        progress: Boolean(onProgress),
      });
      if (!result.path) throw new Error('download returned no path');
      await FileOpener.open({
        filePath: result.path,
        contentType: 'application/vnd.android.package-archive',
      });
    } finally {
      await listener?.remove();
    }
  } catch {
    // Safety net: previous behaviour (system browser download).
    await Browser.open({ url: apkUrl });
  }
}
