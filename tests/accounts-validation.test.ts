import { describe, expect, it } from 'vitest';
import {
  isCalendarDate,
  isIsoInstant,
  parseAccountInput,
  parseAccountsResult,
  parseAccountsState,
  parseManualSnapshotInput
} from '../src/shared/accounts-validation';
import { ACCOUNT_A, UNKNOWN_ACCOUNT, baseState, snapshot, snapshotInput } from './accounts-fixtures';

describe('parseAccountInput', () => {
  it('trims and normalizes a new account', () => {
    expect(parseAccountInput({ id: null, label: '  Konto A ', email: ' Konto1@Example.TEST ', note: '  ' }))
      .toEqual({ id: null, label: 'Konto A', email: 'konto1@example.test', note: null });
  });

  it.each([
    ['missing key', { id: null, label: 'A', email: 'a@example.test' }],
    ['extra key', { id: null, label: 'A', email: 'a@example.test', note: null, path: 'C:\\x' }],
    ['empty label', { id: null, label: '   ', email: 'a@example.test', note: null }],
    ['long label', { id: null, label: 'x'.repeat(61), email: 'a@example.test', note: null }],
    ['invalid email', { id: null, label: 'A', email: 'not-an-email', note: null }],
    ['invalid id', { id: 'abc', label: 'A', email: 'a@example.test', note: null }],
    ['long note', { id: null, label: 'A', email: 'a@example.test', note: 'x'.repeat(501) }],
    ['not an object', 'konto']
  ])('rejects %s', (_name, value) => {
    expect(parseAccountInput(value)).toBeNull();
  });
});

describe('parseManualSnapshotInput', () => {
  it('accepts a fully unknown snapshot', () => {
    expect(parseManualSnapshotInput(snapshotInput())).toEqual(snapshotInput());
  });

  it('accepts known values', () => {
    const input = snapshotInput({
      weeklyRemainingPercent: 45,
      weeklyResetsAt: '2026-10-14T10:00:00.000Z',
      fiveHourRemainingPercent: 100,
      fiveHourResetsAt: '2026-10-10T12:00:00Z',
      resetCreditsRemaining: 2,
      subscriptionEndsOn: '2026-10-15',
      subscriptionRenewal: 'pending'
    });
    expect(parseManualSnapshotInput(input)).toEqual(input);
  });

  it.each([
    ['percent above 100', { weeklyRemainingPercent: 101 }],
    ['negative percent', { fiveHourRemainingPercent: -1 }],
    ['fractional percent', { weeklyRemainingPercent: 45.5 }],
    ['percent as text', { weeklyRemainingPercent: '45' }],
    ['negative reset count', { resetCreditsRemaining: -1 }],
    ['unbounded reset count', { resetCreditsRemaining: 100 }],
    ['invalid calendar date', { subscriptionEndsOn: '2026-02-30' }],
    ['date with time', { subscriptionEndsOn: '2026-10-15T00:00:00Z' }],
    ['instant without offset', { weeklyResetsAt: '2026-10-14T10:00' }],
    ['unknown renewal', { subscriptionRenewal: 'cancelled' }],
    ['invalid account id', { accountId: 'konto' }],
    ['invalid observation time', { observedAt: 'yesterday' }]
  ])('rejects %s', (_name, overrides) => {
    expect(parseManualSnapshotInput({ ...snapshotInput(), ...overrides })).toBeNull();
  });

  it('rejects unexpected keys', () => {
    expect(parseManualSnapshotInput({ ...snapshotInput(), source: 'app-server' })).toBeNull();
  });
});

describe('parseAccountsState', () => {
  it('accepts a valid registry', () => {
    const state = { ...baseState(), snapshots: [snapshot()] };
    expect(parseAccountsState(state)).toEqual(state);
  });

  it('rejects an unsupported schema version', () => {
    expect(parseAccountsState({ ...baseState(), schemaVersion: 2 })).toBeNull();
  });

  it('rejects duplicate emails regardless of case', () => {
    const state = baseState();
    state.accounts[1] = { ...state.accounts[1], email: 'KONTO1@example.test' };
    expect(parseAccountsState(state)).toBeNull();
  });

  it('rejects an active account that does not exist', () => {
    expect(parseAccountsState({ ...baseState(), reportedActiveAccountId: UNKNOWN_ACCOUNT })).toBeNull();
  });

  it('rejects a snapshot for an unknown account', () => {
    expect(parseAccountsState({ ...baseState(), snapshots: [snapshot({ accountId: UNKNOWN_ACCOUNT })] })).toBeNull();
  });

  it('rejects a snapshot from a source other than manual entry', () => {
    expect(parseAccountsState({ ...baseState(), snapshots: [{ ...snapshot(), source: 'app-server' }] })).toBeNull();
  });

  it('rejects more snapshots per account than the history limit', () => {
    const snapshots = Array.from({ length: 21 }, () => snapshot({ accountId: ACCOUNT_A }));
    expect(parseAccountsState({ ...baseState(), snapshots })).toBeNull();
  });
});

describe('parseAccountsResult', () => {
  it('passes through a structured error', () => {
    expect(parseAccountsResult({ ok: false, error: { code: 'DUPLICATE_EMAIL', message: 'Duplicate.' } }))
      .toEqual({ ok: false, error: { code: 'DUPLICATE_EMAIL', message: 'Duplicate.' } });
  });

  it('rejects malformed payloads', () => {
    expect(parseAccountsResult({ ok: true, data: { ...baseState(), schemaVersion: 0 } }).ok).toBe(false);
    expect(parseAccountsResult({ ok: false, error: 'boom' }).ok).toBe(false);
    expect(parseAccountsResult(null).ok).toBe(false);
  });
});

describe('date guards', () => {
  it('distinguishes instants and calendar dates', () => {
    expect(isIsoInstant('2026-10-10T08:00:00.000Z')).toBe(true);
    expect(isIsoInstant('2026-10-10T08:00:00+02:00')).toBe(true);
    expect(isIsoInstant('2026-10-10')).toBe(false);
    expect(isCalendarDate('2028-02-29')).toBe(true);
    expect(isCalendarDate('2026-02-29')).toBe(false);
  });
});
