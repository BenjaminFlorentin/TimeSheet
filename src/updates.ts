import { Browser } from '@capacitor/browser';

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

export async function openUpdate(apkUrl: string): Promise<void> {
  // Chrome Custom Tab: unlike the Capacitor WebView, it knows how to
  // download an APK and hand it to the package installer.
  await Browser.open({ url: apkUrl });
}
