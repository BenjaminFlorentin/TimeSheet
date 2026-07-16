import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Entry } from './types';

const emailOpen = vi.fn().mockResolvedValue(undefined);
let nativePlatform = false;

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => nativePlatform,
  },
}));

vi.mock('capacitor-email-composer', () => ({
  EmailComposer: {
    open: (options: unknown) => emailOpen(options),
  },
}));

vi.mock('write-excel-file/browser', () => ({
  default: vi.fn().mockResolvedValue({
    toBlob: () => Promise.resolve(new Blob(['fake-xlsx'])),
    toFile: vi.fn().mockResolvedValue(undefined),
  }),
}));

const shareMock = vi.fn().mockResolvedValue(undefined);
const writeFileMock = vi.fn().mockResolvedValue({ uri: 'file:///cache/backup.json' });

vi.mock('@capacitor/share', () => ({
  Share: { share: (o: unknown) => shareMock(o) },
}));

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' },
  Filesystem: { writeFile: (o: unknown) => writeFileMock(o) },
}));

import {
  addEntries,
  buildBackupPayload,
  buildOnCallRows,
  buildRows,
  exportBackupJson,
  exportXlsxMail,
  importJson,
  loadEntries,
  saveEntries,
  updateEntry,
} from './storage';
import { filterByRange } from './utils/time';

function entry(date: string, hours: number, minutes: number): Entry {
  return { id: `${date}-${hours}-${minutes}`, date, hours, minutes };
}

function oncall(date: string): Entry {
  return { id: `oncall-${date}`, date, hours: 0, minutes: 0, kind: 'oncall' };
}

beforeEach(() => {
  localStorage.clear();
  emailOpen.mockClear();
  shareMock.mockClear();
  writeFileMock.mockClear();
  nativePlatform = false;
});

describe('addEntries', () => {
  it('persists several entries in one write (on-call period expansion)', () => {
    addEntries([oncall('2026-07-01'), oncall('2026-07-02'), oncall('2026-07-03')]);
    const stored = loadEntries();
    expect(stored).toHaveLength(3);
    expect(stored.every((e) => e.kind === 'oncall')).toBe(true);
  });
});

describe('updateEntry', () => {
  it('merges the patch into the matching entry', () => {
    const e = entry('2026-07-13', 1, 30);
    saveEntries([e]);
    updateEntry(e.id, { hours: 2, minutes: 0, note: 'corrigé' });
    const [updated] = loadEntries();
    expect(updated).toEqual({ ...e, hours: 2, minutes: 0, note: 'corrigé' });
  });

  it('is a no-op for an unknown id', () => {
    const e = entry('2026-07-13', 1, 30);
    saveEntries([e]);
    updateEntry('missing-id', { hours: 9 });
    expect(loadEntries()).toEqual([e]);
  });
});

describe('backup / restore round-trip', () => {
  it('keeps the on-call kind through export and import', async () => {
    const entries = [entry('2026-07-13', 1, 30), oncall('2026-07-19')];
    saveEntries(entries);
    const payload = buildBackupPayload();
    localStorage.clear();

    const file = new File([JSON.stringify(payload)], 'backup.json', {
      type: 'application/json',
    });
    const restored = await importJson(file);
    expect(restored).toEqual(entries);
    expect(restored[1].kind).toBe('oncall');
  });

  it('imports pre-oncall backups (no kind field) as overtime', async () => {
    const legacy = {
      version: 1,
      entries: [{ id: 'a', date: '2026-05-01', hours: 2, minutes: 0 }],
    };
    const file = new File([JSON.stringify(legacy)], 'old-backup.json', {
      type: 'application/json',
    });
    const restored = await importJson(file);
    expect(restored).toHaveLength(1);
    expect(restored[0].kind).toBeUndefined();
    expect(buildRows(restored)).toHaveLength(1);
    expect(buildOnCallRows(restored)).toHaveLength(0);
  });

  it('importJson restores exactly what buildBackupPayload produced', async () => {
    const entries = [entry('2026-07-13', 1, 30), entry('2026-06-01', 2, 15)];
    saveEntries(entries);
    const payload = buildBackupPayload();
    expect(payload.version).toBe(1);

    localStorage.clear();
    expect(loadEntries()).toEqual([]);

    const file = new File([JSON.stringify(payload)], 'backup.json', {
      type: 'application/json',
    });
    const restored = await importJson(file);
    expect(restored).toEqual(entries);
    expect(loadEntries()).toEqual(entries);
  });

  it('native backup writes the file then opens the share sheet', async () => {
    nativePlatform = true;
    saveEntries([entry('2026-07-13', 1, 30)]);

    await exportBackupJson();

    expect(writeFileMock).toHaveBeenCalledTimes(1);
    const writeArgs = writeFileMock.mock.calls[0][0] as {
      path: string;
      data: string;
    };
    expect(writeArgs.path).toMatch(/^timesheet-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(JSON.parse(writeArgs.data).entries).toHaveLength(1);
    expect(shareMock).toHaveBeenCalledWith(
      expect.objectContaining({ files: ['file:///cache/backup.json'] }),
    );
  });
});

describe('buildRows (export columns)', () => {
  it('produces English month names, padded days, decimal hours and /8 ratio', () => {
    const rows = buildRows([entry('2026-01-05', 1, 30), entry('2026-07-13', 2, 0)]);
    expect(rows).toEqual([
      {
        year: '2026',
        month: 'January',
        day: '05',
        extraHour: '1.50',
        extraHourRatio: '0.1875',
      },
      {
        year: '2026',
        month: 'July',
        day: '13',
        extraHour: '2.00',
        extraHourRatio: '0.25',
      },
    ]);
  });

  it('sorts rows in ascending date order', () => {
    const rows = buildRows([entry('2026-07-13', 1, 0), entry('2026-07-01', 1, 0)]);
    expect(rows.map((r) => r.day)).toEqual(['01', '13']);
  });

  it('excludes on-call days from the overtime sheet', () => {
    const rows = buildRows([entry('2026-07-13', 1, 0), oncall('2026-07-14')]);
    expect(rows).toHaveLength(1);
    expect(rows[0].day).toBe('13');
  });
});

describe('buildOnCallRows (On-call sheet)', () => {
  it('lists only on-call days, sorted ascending, with English months', () => {
    const rows = buildOnCallRows([
      entry('2026-07-13', 1, 0),
      oncall('2026-07-20'),
      oncall('2026-01-05'),
    ]);
    expect(rows).toEqual([
      { year: '2026', month: 'January', day: '05' },
      { year: '2026', month: 'July', day: '20' },
    ]);
  });
});

describe('exportXlsxMail on native platform (regression: routing bug)', () => {
  it('opens the native email composer with subject, empty body and base64 attachment', async () => {
    nativePlatform = true;
    saveEntries([entry('2026-07-13', 1, 30)]);

    await exportXlsxMail();

    expect(emailOpen).toHaveBeenCalledTimes(1);
    const options = emailOpen.mock.calls[0][0] as {
      subject: string;
      body: string;
      attachments: Array<{ type: string; path: string; name: string }>;
    };
    expect(options.subject).toBe('Export des heures supplémentaires');
    expect(options.body).toBe('');
    expect(options.attachments).toHaveLength(1);
    expect(options.attachments[0].type).toBe('base64');
    expect(options.attachments[0].name).toMatch(/^timesheet-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(options.attachments[0].path.length).toBeGreaterThan(0);
  });

  it('accepts a filtered subset of entries (date-range export)', async () => {
    nativePlatform = true;
    const all = [
      entry('2026-06-15', 1, 0),
      entry('2026-07-10', 2, 0),
      entry('2026-08-02', 3, 0),
    ];
    saveEntries(all);
    const july = filterByRange(all, '2026-07-01', '2026-07-31');
    expect(july).toHaveLength(1);

    await exportXlsxMail(july);

    expect(emailOpen).toHaveBeenCalledTimes(1);
    // The rows built for July only contain the July entry
    expect(buildRows(july)).toEqual([
      {
        year: '2026',
        month: 'July',
        day: '10',
        extraHour: '2.00',
        extraHourRatio: '0.25',
      },
    ]);
  });
});
