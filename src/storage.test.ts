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

import { buildRows, exportXlsxMail, saveEntries } from './storage';
import { filterByRange } from './utils/time';

function entry(date: string, hours: number, minutes: number): Entry {
  return { id: `${date}-${hours}-${minutes}`, date, hours, minutes };
}

beforeEach(() => {
  localStorage.clear();
  emailOpen.mockClear();
  nativePlatform = false;
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
