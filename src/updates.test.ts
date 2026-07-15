import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/browser', () => ({
  Browser: { open: vi.fn().mockResolvedValue(undefined) },
}));

import { checkForUpdate, parseReleaseVersion } from './updates';

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
