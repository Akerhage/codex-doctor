import { describe, expect, it } from 'vitest';
import { recordManualSnapshot, removeAccount, setReportedActive, upsertAccount } from '../electron/services/accounts/account-operations';
import { ACCOUNT_A, ACCOUNT_B, UNKNOWN_ACCOUNT, baseState, snapshot, snapshotInput } from './accounts-fixtures';

const NEW_ID = '44444444-4444-4444-8444-444444444444';
const now = new Date('2026-10-10T09:00:00.000Z');

describe('upsertAccount', () => {
  it('adds an account with a main-process id and timestamp', () => {
    const result = upsertAccount(baseState(), { id: null, label: 'Konto C', email: 'konto3@example.test', note: null }, { newId: NEW_ID, now });
    expect(result.ok && result.data.accounts.at(-1)).toEqual({
      id: NEW_ID, label: 'Konto C', email: 'konto3@example.test', note: null, createdAt: now.toISOString()
    });
  });

  it('rejects a duplicate email, ignoring case', () => {
    const result = upsertAccount(baseState(), { id: null, label: 'Kopia', email: 'KONTO1@example.test', note: null }, { newId: NEW_ID, now });
    expect(result).toMatchObject({ ok: false, error: { code: 'DUPLICATE_EMAIL' } });
  });

  it('edits an account and allows it to keep its own email', () => {
    const result = upsertAccount(baseState(), { id: ACCOUNT_A, label: 'Privat', email: 'konto1@example.test', note: 'n' }, { newId: NEW_ID, now });
    expect(result.ok && result.data.accounts[0]).toMatchObject({ id: ACCOUNT_A, label: 'Privat', note: 'n', createdAt: '2026-10-01T08:00:00.000Z' });
  });

  it('rejects editing an account that does not exist', () => {
    const result = upsertAccount(baseState(), { id: UNKNOWN_ACCOUNT, label: 'X', email: 'x@example.test', note: null }, { newId: NEW_ID, now });
    expect(result).toMatchObject({ ok: false, error: { code: 'ACCOUNT_NOT_FOUND' } });
  });
});

describe('removeAccount', () => {
  it('removes the account, its snapshots and the active mark', () => {
    const state = { ...baseState(), snapshots: [snapshot(), snapshot({ accountId: ACCOUNT_B })] };
    const result = removeAccount(state, ACCOUNT_A);
    expect(result.ok && result.data).toMatchObject({
      reportedActiveAccountId: null,
      accounts: [{ id: ACCOUNT_B }],
      snapshots: [{ accountId: ACCOUNT_B }]
    });
  });

  it('rejects an unknown account', () => {
    expect(removeAccount(baseState(), UNKNOWN_ACCOUNT).ok).toBe(false);
  });
});

describe('recordManualSnapshot', () => {
  it('stores the values as a manual snapshot with the recording time', () => {
    const result = recordManualSnapshot(baseState(), snapshotInput({ weeklyRemainingPercent: 94 }), now);
    expect(result.ok && result.data.snapshots).toEqual([snapshot({ weeklyRemainingPercent: 94, recordedAt: now.toISOString() })]);
  });

  it('rejects observations in the future beyond a small clock tolerance', () => {
    expect(recordManualSnapshot(baseState(), snapshotInput({ observedAt: '2026-10-10T09:04:00.000Z' }), now).ok).toBe(true);
    expect(recordManualSnapshot(baseState(), snapshotInput({ observedAt: '2026-10-10T09:06:00.000Z' }), now))
      .toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
  });

  it('rejects reset times earlier than the observation', () => {
    expect(recordManualSnapshot(baseState(), snapshotInput({ weeklyResetsAt: '2026-10-10T07:00:00.000Z' }), now).ok).toBe(false);
    expect(recordManualSnapshot(baseState(), snapshotInput({ fiveHourResetsAt: '2026-10-10T07:59:00.000Z' }), now).ok).toBe(false);
  });

  it('rejects an unknown account', () => {
    expect(recordManualSnapshot(baseState(), snapshotInput({ accountId: UNKNOWN_ACCOUNT }), now)).toMatchObject({ ok: false, error: { code: 'ACCOUNT_NOT_FOUND' } });
  });

  it('keeps only the 20 newest observations per account', () => {
    let state = baseState();
    for (let index = 0; index < 22; index += 1) {
      const observedAt = new Date(Date.UTC(2026, 9, 9, index)).toISOString();
      const result = recordManualSnapshot(state, snapshotInput({ observedAt, weeklyRemainingPercent: index }), now);
      if (!result.ok) throw new Error(result.error.message);
      state = result.data;
    }
    const kept = state.snapshots.map((item) => item.weeklyRemainingPercent);
    expect(kept).toHaveLength(20);
    expect(kept).not.toContain(0);
    expect(kept).not.toContain(1);
  });
});

describe('setReportedActive', () => {
  it('sets and clears the reported active account', () => {
    const set = setReportedActive(baseState(), ACCOUNT_B);
    expect(set.ok && set.data.reportedActiveAccountId).toBe(ACCOUNT_B);
    const cleared = setReportedActive(baseState(), null);
    expect(cleared.ok && cleared.data.reportedActiveAccountId).toBeNull();
  });

  it('rejects an unknown account', () => {
    expect(setReportedActive(baseState(), UNKNOWN_ACCOUNT).ok).toBe(false);
  });
});
