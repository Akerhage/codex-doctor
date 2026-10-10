import type { Result } from '../../../src/shared/contracts.js';
import {
  ACCOUNTS_SCHEMA_VERSION,
  MAX_SNAPSHOTS_PER_ACCOUNT,
  type AccountInput,
  type AccountsErrorCode,
  type AccountsState,
  type CapacitySnapshot,
  type ManualSnapshotInput
} from '../../../src/shared/accounts-contracts.js';
import { normalizeEmail } from '../../../src/shared/accounts-validation.js';

// Pure state transitions for the Doctor-owned account registry. Inputs are already
// validated for shape; these functions enforce cross-record rules.

export const OBSERVED_AT_FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export const emptyAccountsState = (): AccountsState => ({
  schemaVersion: ACCOUNTS_SCHEMA_VERSION,
  accounts: [],
  reportedActiveAccountId: null,
  snapshots: []
});

export const accountsError = (code: AccountsErrorCode, message: string): Result<never> => ({
  ok: false,
  error: { code, message }
});

const accountExists = (state: AccountsState, accountId: string): boolean =>
  state.accounts.some((account) => account.id === accountId);

export const upsertAccount = (
  state: AccountsState,
  input: AccountInput,
  context: { newId: string; now: Date }
): Result<AccountsState> => {
  const email = normalizeEmail(input.email);
  const duplicate = state.accounts.some((account) => account.id !== input.id && normalizeEmail(account.email) === email);
  if (duplicate) return accountsError('DUPLICATE_EMAIL', 'Another account already uses this email address.');

  if (input.id === null) {
    return {
      ok: true,
      data: {
        ...state,
        accounts: [...state.accounts, {
          id: context.newId,
          label: input.label,
          email,
          note: input.note,
          createdAt: context.now.toISOString()
        }]
      }
    };
  }

  if (!accountExists(state, input.id)) return accountsError('ACCOUNT_NOT_FOUND', 'The account no longer exists.');
  return {
    ok: true,
    data: {
      ...state,
      accounts: state.accounts.map((account) => account.id === input.id
        ? { ...account, label: input.label, email, note: input.note }
        : account)
    }
  };
};

export const removeAccount = (state: AccountsState, accountId: string): Result<AccountsState> => {
  if (!accountExists(state, accountId)) return accountsError('ACCOUNT_NOT_FOUND', 'The account no longer exists.');
  return {
    ok: true,
    data: {
      ...state,
      accounts: state.accounts.filter((account) => account.id !== accountId),
      reportedActiveAccountId: state.reportedActiveAccountId === accountId ? null : state.reportedActiveAccountId,
      snapshots: state.snapshots.filter((snapshot) => snapshot.accountId !== accountId)
    }
  };
};

const resetPrecedesObservation = (resetsAt: string | null, observedAt: string): boolean =>
  resetsAt !== null && Date.parse(resetsAt) < Date.parse(observedAt);

export const recordManualSnapshot = (
  state: AccountsState,
  input: ManualSnapshotInput,
  now: Date
): Result<AccountsState> => {
  if (!accountExists(state, input.accountId)) return accountsError('ACCOUNT_NOT_FOUND', 'The account no longer exists.');
  if (Date.parse(input.observedAt) > now.getTime() + OBSERVED_AT_FUTURE_TOLERANCE_MS) {
    return accountsError('INVALID_INPUT', 'The observation time cannot be in the future.');
  }
  if (resetPrecedesObservation(input.weeklyResetsAt, input.observedAt) || resetPrecedesObservation(input.fiveHourResetsAt, input.observedAt)) {
    return accountsError('INVALID_INPUT', 'A reset time cannot be earlier than the observation time.');
  }

  const snapshot: CapacitySnapshot = {
    accountId: input.accountId,
    source: 'manual',
    observedAt: input.observedAt,
    recordedAt: now.toISOString(),
    weeklyRemainingPercent: input.weeklyRemainingPercent,
    weeklyResetsAt: input.weeklyResetsAt,
    fiveHourRemainingPercent: input.fiveHourRemainingPercent,
    fiveHourResetsAt: input.fiveHourResetsAt,
    resetCreditsRemaining: input.resetCreditsRemaining,
    subscriptionEndsOn: input.subscriptionEndsOn,
    subscriptionRenewal: input.subscriptionRenewal
  };

  let snapshots = [...state.snapshots, snapshot];
  const forAccount = snapshots.filter((item) => item.accountId === input.accountId);
  if (forAccount.length > MAX_SNAPSHOTS_PER_ACCOUNT) {
    const oldestFirst = [...forAccount].sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
    const discard = new Set(oldestFirst.slice(0, forAccount.length - MAX_SNAPSHOTS_PER_ACCOUNT));
    snapshots = snapshots.filter((item) => !discard.has(item));
  }

  return { ok: true, data: { ...state, snapshots } };
};

export const setReportedActive = (state: AccountsState, accountId: string | null): Result<AccountsState> => {
  if (accountId !== null && !accountExists(state, accountId)) return accountsError('ACCOUNT_NOT_FOUND', 'The account no longer exists.');
  return { ok: true, data: { ...state, reportedActiveAccountId: accountId } };
};
