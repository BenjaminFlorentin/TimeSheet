import { describe, expect, it } from 'vitest';
import { translate } from './i18n';

describe('translate', () => {
  it('returns French and English strings for the same key', () => {
    expect(translate('fr', 'nav.summary')).toBe('Résumé');
    expect(translate('en', 'nav.summary')).toBe('Summary');
  });

  it('interpolates variables', () => {
    expect(translate('fr', 'update.version', { v: 'abc1234' })).toBe(
      'Version abc1234',
    );
    expect(translate('en', 'summary.daysPlural', { n: 10 })).toBe('10 days');
  });

  it('falls back to the key itself when missing', () => {
    // @ts-expect-error — deliberately unknown key
    expect(translate('fr', 'nope.missing')).toBe('nope.missing');
  });
});
