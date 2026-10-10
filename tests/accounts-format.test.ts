import { describe, expect, it } from 'vitest';
import { formatAge, parseCountField, parseDateField, parseLocalDateTimeField, parsePercentField } from '../src/accounts/format';

describe('form field parsing', () => {
  it('treats an empty field as unknown, never as zero', () => {
    expect(parsePercentField('  ', 'Weekly')).toEqual({ ok: true, value: null });
    expect(parseCountField('', 'Resets')).toEqual({ ok: true, value: null });
    expect(parseLocalDateTimeField('', 'Reset')).toEqual({ ok: true, value: null });
    expect(parseDateField('', 'End')).toEqual({ ok: true, value: null });
  });

  it('accepts whole numbers within range', () => {
    expect(parsePercentField('0', 'Weekly')).toEqual({ ok: true, value: 0 });
    expect(parsePercentField('100', 'Weekly')).toEqual({ ok: true, value: 100 });
    expect(parseCountField('3', 'Resets')).toEqual({ ok: true, value: 3 });
  });

  it.each(['101', '-1', '4.5', '45%', 'abc'])('rejects percent %s', (text) => {
    expect(parsePercentField(text, 'Weekly').ok).toBe(false);
  });

  it('converts a local date and time to an ISO instant', () => {
    const result = parseLocalDateTimeField('2026-10-14T10:30', 'Reset');
    expect(result).toEqual({ ok: true, value: new Date('2026-10-14T10:30').toISOString() });
  });

  it('rejects impossible dates', () => {
    expect(parseDateField('2026-02-30', 'End').ok).toBe(false);
    expect(parseLocalDateTimeField('next week', 'Reset').ok).toBe(false);
  });
});

describe('formatAge', () => {
  it('describes age in coarse units', () => {
    expect(formatAge(10_000)).toBe('just now');
    expect(formatAge(5 * 60_000)).toBe('5 min ago');
    expect(formatAge(3 * 3_600_000)).toBe('3 h ago');
    expect(formatAge(72 * 3_600_000)).toBe('3 days ago');
  });
});
