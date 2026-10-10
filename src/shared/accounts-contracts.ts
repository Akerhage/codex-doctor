import type { Result } from './contracts.js';

// K1 account registry. Every value is Doctor-owned and manually reported by the user;
// nothing here is read from Codex. `null` always means unknown.

export const ACCOUNTS_SCHEMA_VERSION = 1;
export const MAX_SNAPSHOTS_PER_ACCOUNT = 20;

export type SubscriptionRenewal = 'renewed' | 'pending' | 'unknown';

export const subscriptionRenewals: readonly SubscriptionRenewal[] = ['renewed', 'pending', 'unknown'];

export interface AccountRecord {
  id: string;
  label: string;
  email: string;
  note: string | null;
  createdAt: string;
}

export interface ManualCapacityValues {
  weeklyRemainingPercent: number | null;
  weeklyResetsAt: string | null;
  fiveHourRemainingPercent: number | null;
  fiveHourResetsAt: string | null;
  resetCreditsRemaining: number | null;
  subscriptionEndsOn: string | null;
  subscriptionRenewal: SubscriptionRenewal;
}

export interface CapacitySnapshot extends ManualCapacityValues {
  accountId: string;
  source: 'manual';
  observedAt: string;
  recordedAt: string;
}

export interface AccountsState {
  schemaVersion: typeof ACCOUNTS_SCHEMA_VERSION;
  accounts: AccountRecord[];
  /** The account the user says is active. Doctor has not verified it. */
  reportedActiveAccountId: string | null;
  /** Newest last; at most MAX_SNAPSHOTS_PER_ACCOUNT per account. */
  snapshots: CapacitySnapshot[];
}

export interface AccountInput {
  id: string | null;
  label: string;
  email: string;
  note: string | null;
}

export interface ManualSnapshotInput extends ManualCapacityValues {
  accountId: string;
  observedAt: string;
}

export type AccountsErrorCode =
  | 'INVALID_INPUT'
  | 'DUPLICATE_EMAIL'
  | 'ACCOUNT_NOT_FOUND'
  | 'REGISTRY_UNREADABLE'
  | 'REGISTRY_WRITE_FAILED'
  | 'INVALID_ACCOUNTS_PAYLOAD';

export const accountChannels = {
  getState: 'doctor:accounts:get-state',
  upsertAccount: 'doctor:accounts:upsert-account',
  removeAccount: 'doctor:accounts:remove-account',
  recordManualSnapshot: 'doctor:accounts:record-manual-snapshot',
  setReportedActive: 'doctor:accounts:set-reported-active'
} as const;

export interface AccountsApi {
  getState(): Promise<Result<AccountsState>>;
  upsertAccount(input: AccountInput): Promise<Result<AccountsState>>;
  removeAccount(accountId: string): Promise<Result<AccountsState>>;
  recordManualSnapshot(input: ManualSnapshotInput): Promise<Result<AccountsState>>;
  setReportedActive(accountId: string | null): Promise<Result<AccountsState>>;
}
