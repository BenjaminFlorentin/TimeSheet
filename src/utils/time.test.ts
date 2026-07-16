import { describe, expect, it } from 'vitest';
import type { Entry } from '../types';
import {
  addMinutesToHm,
  entryMinutes,
  filterByRange,
  isOnCall,
  oncallOnly,
  overtimeOnly,
  filterThisMonth,
  filterThisWeek,
  formatDuration,
  formatRatio,
  groupByMonth,
  monthRange,
  parseIsoDate,
  ratioOverEight,
  sortByDateDesc,
  totalMinutes,
} from './time';

function entry(date: string, hours: number, minutes: number): Entry {
  return { id: `${date}-${hours}-${minutes}`, date, hours, minutes };
}

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(90)).toBe('1h 30min');
    expect(formatDuration(120)).toBe('2h');
    expect(formatDuration(45)).toBe('45min');
    expect(formatDuration(0)).toBe('0min');
    expect(formatDuration(65)).toBe('1h 05min');
  });
});

describe('ratioOverEight / formatRatio', () => {
  it('divides by 8 and formats as decimal with dot', () => {
    expect(formatRatio(ratioOverEight(entry('2026-07-13', 7, 0)))).toBe('0.875');
    expect(formatRatio(ratioOverEight(entry('2026-07-13', 1, 30)))).toBe('0.1875');
    expect(formatRatio(ratioOverEight(entry('2026-07-13', 8, 0)))).toBe('1');
    expect(formatRatio(ratioOverEight(entry('2026-07-13', 2, 0)))).toBe('0.25');
  });
});

describe('totalMinutes / entryMinutes', () => {
  it('sums entries', () => {
    const entries = [entry('2026-07-13', 1, 30), entry('2026-07-12', 2, 15)];
    expect(entryMinutes(entries[0])).toBe(90);
    expect(totalMinutes(entries)).toBe(225);
  });
});

describe('week/month filters', () => {
  // Wednesday 2026-07-15; week = Monday 13 → Sunday 19
  const now = new Date(2026, 6, 15);
  const inWeek = entry('2026-07-13', 1, 0);
  const sundayOfWeek = entry('2026-07-19', 1, 0);
  const prevWeekSameMonth = entry('2026-07-06', 1, 0);
  const prevMonth = entry('2026-06-30', 1, 0);
  const all = [inWeek, sundayOfWeek, prevWeekSameMonth, prevMonth];

  it('filterThisWeek keeps Monday through Sunday of the current week', () => {
    expect(filterThisWeek(all, now)).toEqual([inWeek, sundayOfWeek]);
  });

  it('filterThisMonth keeps the calendar month', () => {
    expect(filterThisMonth(all, now)).toEqual([
      inWeek,
      sundayOfWeek,
      prevWeekSameMonth,
    ]);
  });
});

describe('sorting and grouping', () => {
  it('sortByDateDesc puts newest first', () => {
    const sorted = sortByDateDesc([
      entry('2026-07-01', 1, 0),
      entry('2026-07-15', 1, 0),
    ]);
    expect(sorted.map((e) => e.date)).toEqual(['2026-07-15', '2026-07-01']);
  });

  it('groupByMonth groups newest month first', () => {
    const groups = groupByMonth([
      entry('2026-06-30', 1, 0),
      entry('2026-07-01', 1, 0),
      entry('2026-07-15', 1, 0),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].entries).toHaveLength(2);
    expect(groups[1].entries).toHaveLength(1);
  });
});

describe('on-call helpers', () => {
  const ot = entry('2026-07-13', 1, 0);
  const oc: Entry = { id: 'oc', date: '2026-07-14', hours: 0, minutes: 0, kind: 'oncall' };

  it('isOnCall detects the kind, defaulting to overtime', () => {
    expect(isOnCall(oc)).toBe(true);
    expect(isOnCall(ot)).toBe(false);
    expect(isOnCall({ ...ot, kind: 'overtime' })).toBe(false);
  });

  it('overtimeOnly / oncallOnly split a mixed list', () => {
    const mixed = [ot, oc];
    expect(overtimeOnly(mixed)).toEqual([ot]);
    expect(oncallOnly(mixed)).toEqual([oc]);
  });
});

describe('addMinutesToHm', () => {
  it('adds minutes and carries into hours', () => {
    expect(addMinutesToHm(0, 45, 30)).toEqual({ hours: 1, minutes: 15 });
    expect(addMinutesToHm(1, 0, 60)).toEqual({ hours: 2, minutes: 0 });
    expect(addMinutesToHm(0, 0, 15)).toEqual({ hours: 0, minutes: 15 });
  });

  it('clamps at 23h59 and never goes negative', () => {
    expect(addMinutesToHm(23, 50, 60)).toEqual({ hours: 23, minutes: 59 });
    expect(addMinutesToHm(0, 5, -30)).toEqual({ hours: 0, minutes: 0 });
  });
});

describe('monthRange', () => {
  it('returns first and last day of a 31-day month', () => {
    expect(monthRange(new Date(2026, 6, 15))).toEqual({
      from: '2026-07-01',
      to: '2026-07-31',
    });
  });

  it('handles 30-day months and February', () => {
    expect(monthRange(new Date(2026, 3, 10))).toEqual({
      from: '2026-04-01',
      to: '2026-04-30',
    });
    expect(monthRange(new Date(2026, 1, 5))).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    });
    expect(monthRange(new Date(2028, 1, 5))).toEqual({
      from: '2028-02-01',
      to: '2028-02-29',
    });
  });
});

describe('filterByRange', () => {
  const all = [
    entry('2026-06-30', 1, 0),
    entry('2026-07-01', 1, 0),
    entry('2026-07-15', 1, 0),
    entry('2026-07-31', 1, 0),
    entry('2026-08-01', 1, 0),
  ];

  it('keeps entries within inclusive bounds', () => {
    const filtered = filterByRange(all, '2026-07-01', '2026-07-31');
    expect(filtered.map((e) => e.date)).toEqual([
      '2026-07-01',
      '2026-07-15',
      '2026-07-31',
    ]);
  });

  it('returns empty for a range with no entries', () => {
    expect(filterByRange(all, '2025-01-01', '2025-12-31')).toEqual([]);
  });

  it('returns everything for a covering range', () => {
    expect(filterByRange(all, '2026-01-01', '2026-12-31')).toHaveLength(5);
  });
});

describe('parseIsoDate', () => {
  it('parses as local date', () => {
    const d = parseIsoDate('2026-01-05');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(5);
  });
});
