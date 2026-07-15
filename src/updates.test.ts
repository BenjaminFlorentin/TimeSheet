import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const browserOpen = vi.fn().mockResolvedValue(undefined);
const downloadFile = vi.fn();
const fileOpen = vi.fn().mockResolvedValue(undefined);

vi.mock('@capacitor/browser', () => ({
  Browser: { open: (o: unknown) => browserOpen(o) },
}));

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Filesystem: {
    downloadFile: (o: unknown) => downloadFile(o),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn().mockResolvedValue(undefined) }),
  },
}));

vi.mock('@capacitor-community/file-opener', () => ({
  FileOpener: { open: (o: unknown) => fileOpen(o) },
}));

import { checkForUpdate, openUpdate, parseReleaseVersion } from './updates';

beforeEach(() => {
  browserOpen.mockClear();
  downloadFile.mockReset();
  fileOpen.mockClear();
});

function mockRelease(body: string, withApk = true) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        body,
        assets: withApk
          ? [
              {
                name: 'TimeSheet.apk',
                browser_download_url:
                  'https://github.com/BenjaminFlorentin/TimeSheet/releases/download/apk-latest/TimeSheet.apk',
              },
            ]
          : [],
      }),
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseReleaseVersion', () => {
  it('extracts the sha from a version line', () => {
    const body = 'Some release notes.\n\nversion: abc123def456abc123def456abc123def456abcd';
    expect(parseReleaseVersion(body)).toBe(
      'abc123def456abc123def456abc123def456abcd',
    );
  });

  it('returns null when no version line exists', () => {
    expect(parseReleaseVersion('just notes')).toBeNull();
    expect(parseReleaseVersion('')).toBeNull();
  });
});

describe('checkForUpdate', () => {
  it('reports no update when the release version matches the app version', async () => {
    // Test build runs with __APP_VERSION__ undefined → CURRENT_VERSION 'dev',
    // and dev builds never claim an update regardless of the release version.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(mockRelease('version: abc1234')),
    );
    const result = await checkForUpdate();
    expect(result.available).toBe(false);
    expect(result.latestVersion).toBe('abc1234');
    expect(result.apkUrl).toContain('TimeSheet.apk');
  });

  it('reports no update when the release has no version line', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockRelease('no marker')));
    const result = await checkForUpdate();
    expect(result.available).toBe(false);
  });

  it('reports no update when the release has no APK asset', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(mockRelease('version: abc1234', false)),
    );
    const result = await checkForUpdate();
    expect(result.available).toBe(false);
  });

  it('swallows network errors instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(checkForUpdate()).resolves.toEqual({ available: false });
  });

  it('reports no update on non-OK HTTP responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false } as Response),
    );
    await expect(checkForUpdate()).resolves.toEqual({ available: false });
  });
});

describe('openUpdate (native download + installer)', () => {
  const APK_URL =
    'https://github.com/BenjaminFlorentin/TimeSheet/releases/download/apk-latest/TimeSheet.apk';

  it('downloads the APK to cache then opens the package installer', async () => {
    downloadFile.mockResolvedValue({ path: '/cache/TimeSheet-update.apk' });

    await openUpdate(APK_URL);

    expect(downloadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        url: APK_URL,
        path: 'TimeSheet-update.apk',
        directory: 'CACHE',
      }),
    );
    expect(fileOpen).toHaveBeenCalledWith({
      filePath: '/cache/TimeSheet-update.apk',
      contentType: 'application/vnd.android.package-archive',
    });
    expect(browserOpen).not.toHaveBeenCalled();
  });

  it('falls back to the browser when the native download fails', async () => {
    downloadFile.mockRejectedValue(new Error('network'));

    await openUpdate(APK_URL);

    expect(fileOpen).not.toHaveBeenCalled();
    expect(browserOpen).toHaveBeenCalledWith({ url: APK_URL });
  });
});
