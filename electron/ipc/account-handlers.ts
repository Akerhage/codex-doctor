import { randomUUID } from 'node:crypto';
import type { Result } from '../../src/shared/contracts.js';
import type { AccountsState } from '../../src/shared/accounts-contracts.js';
import { isUuid, parseAccountInput, parseManualSnapshotInput } from '../../src/shared/accounts-validation.js';
import {
  accountsError,
  recordManualSnapshot,
  removeAccount,
  setReportedActive,
  upsertAccount
} from '../services/accounts/account-operations.js';
import type { RegistryStore } from '../services/accounts/registry-store.js';

const invalidInput = (): Result<AccountsState> =>
  accountsError('INVALID_INPUT', 'The request was rejected because it failed validation.');

/** Renderer arguments are validated here again; the preload check is not trusted. */
export const createAccountHandlers = (store: RegistryStore, clock: () => Date = () => new Date()) => ({
  getState: (): Promise<Result<AccountsState>> => store.read(),

  upsertAccount: (value: unknown): Promise<Result<AccountsState>> => {
    const input = parseAccountInput(value);
    if (!input) return Promise.resolve(invalidInput());
    return store.update((state) => upsertAccount(state, input, { newId: randomUUID(), now: clock() }));
  },

  removeAccount: (value: unknown): Promise<Result<AccountsState>> => {
    if (!isUuid(value)) return Promise.resolve(invalidInput());
    return store.update((state) => removeAccount(state, value));
  },

  recordManualSnapshot: (value: unknown): Promise<Result<AccountsState>> => {
    const input = parseManualSnapshotInput(value);
    if (!input) return Promise.resolve(invalidInput());
    return store.update((state) => recordManualSnapshot(state, input, clock()));
  },

  setReportedActive: (value: unknown): Promise<Result<AccountsState>> => {
    if (value !== null && !isUuid(value)) return Promise.resolve(invalidInput());
    return store.update((state) => setReportedActive(state, value));
  }
});
