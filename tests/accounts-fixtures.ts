import type { AccountsState, CapacitySnapshot, ManualSnapshotInput } from '../src/shared/accounts-contracts';

// Fictional accounts only. Never put real addresses or values from a real account here.
export const ACCOUNT_A = '11111111-1111-4111-8111-111111111111';
export const ACCOUNT_B = '22222222-2222-4222-8222-222222222222';
export const UNKNOWN_ACCOUNT = '33333333-3333-4333-8333-333333333333';

export const baseState = (): AccountsState => ({
  schemaVersion: 1,
  accounts: [
    { id: ACCOUNT_A, label: 'Konto A', email: 'konto1@example.test', note: null, createdAt: '2026-10-01T08:00:00.000Z' },
    { id: ACCOUNT_B, label: 'Konto B', email: 'konto2@example.test', note: 'Arbete', createdAt: '2026-10-01T08:05:00.000Z' }
  ],
  reportedActiveAccountId: ACCOUNT_A,
  snapshots: []
});

export const emptyCapacity = {
  weeklyRemainingPercent: null,
  weeklyResetsAt: null,
  fiveHourRemainingPercent: null,
  fiveHourResetsAt: null,
  resetCreditsRemaining: null,
  subscriptionEndsOn: null,
  subscriptionRenewal: 'unknown'
} as const;

export const snapshotInput = (overrides: Partial<ManualSnapshotInput> = {}): ManualSnapshotInput => ({
  accountId: ACCOUNT_A,
  observedAt: '2026-10-10T08:00:00.000Z',
  ...emptyCapacity,
  ...overrides
});

export const snapshot = (overrides: Partial<CapacitySnapshot> = {}): CapacitySnapshot => ({
  accountId: ACCOUNT_A,
  source: 'manual',
  observedAt: '2026-10-10T08:00:00.000Z',
  recordedAt: '2026-10-10T08:01:00.000Z',
  ...emptyCapacity,
  ...overrides
});
