import type { Result } from './contracts.js';
import {
  ACCOUNTS_SCHEMA_VERSION,
  MAX_SNAPSHOTS_PER_ACCOUNT,
  subscriptionRenewals,
  type AccountInput,
  type AccountRecord,
  type AccountsState,
  type CapacitySnapshot,
  type ManualCapacityValues,
  type ManualSnapshotInput,
  type SubscriptionRenewal
} from './accounts-contracts.js';

export const LABEL_MAX_LENGTH = 60;
export const EMAIL_MAX_LENGTH = 254;
export const NOTE_MAX_LENGTH = 500;
export const RESET_CREDITS_MAX = 99;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
};

export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_PATTERN.test(value);

export const isIsoInstant = (value: unknown): value is string =>
  typeof value === 'string' && ISO_INSTANT_PATTERN.test(value) && !Number.isNaN(Date.parse(value));

export const isCalendarDate = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const match = CALENDAR_DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

export const isPercent = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100;

const isResetCredits = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= RESET_CREDITS_MAX;

const isRenewal = (value: unknown): value is SubscriptionRenewal =>
  typeof value === 'string' && subscriptionRenewals.includes(value as SubscriptionRenewal);

const nullable = <T>(value: unknown, guard: (candidate: unknown) => candidate is T): value is T | null =>
  value === null || guard(value);

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const isLabel = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= LABEL_MAX_LENGTH;

const isEmail = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(value.trim());

const isNote = (value: unknown): value is string | null =>
  value === null || (typeof value === 'string' && value.length <= NOTE_MAX_LENGTH);

const capacityKeys = [
  'weeklyRemainingPercent',
  'weeklyResetsAt',
  'fiveHourRemainingPercent',
  'fiveHourResetsAt',
  'resetCreditsRemaining',
  'subscriptionEndsOn',
  'subscriptionRenewal'
] as const;

const parseCapacityValues = (value: Record<string, unknown>): ManualCapacityValues | null => {
  if (!nullable(value.weeklyRemainingPercent, isPercent)) return null;
  if (!nullable(value.weeklyResetsAt, isIsoInstant)) return null;
  if (!nullable(value.fiveHourRemainingPercent, isPercent)) return null;
  if (!nullable(value.fiveHourResetsAt, isIsoInstant)) return null;
  if (!nullable(value.resetCreditsRemaining, isResetCredits)) return null;
  if (!nullable(value.subscriptionEndsOn, isCalendarDate)) return null;
  if (!isRenewal(value.subscriptionRenewal)) return null;
  return {
    weeklyRemainingPercent: value.weeklyRemainingPercent,
    weeklyResetsAt: value.weeklyResetsAt,
    fiveHourRemainingPercent: value.fiveHourRemainingPercent,
    fiveHourResetsAt: value.fiveHourResetsAt,
    resetCreditsRemaining: value.resetCreditsRemaining,
    subscriptionEndsOn: value.subscriptionEndsOn,
    subscriptionRenewal: value.subscriptionRenewal
  };
};

export const parseAccountInput = (value: unknown): AccountInput | null => {
  if (!isRecord(value) || !hasExactKeys(value, ['id', 'label', 'email', 'note'])) return null;
  if (!nullable(value.id, isUuid) || !isLabel(value.label) || !isEmail(value.email) || !isNote(value.note)) return null;
  const note = value.note === null || value.note.trim().length === 0 ? null : value.note.trim();
  return { id: value.id, label: value.label.trim(), email: normalizeEmail(value.email), note };
};

export const parseManualSnapshotInput = (value: unknown): ManualSnapshotInput | null => {
  if (!isRecord(value) || !hasExactKeys(value, ['accountId', 'observedAt', ...capacityKeys])) return null;
  if (!isUuid(value.accountId) || !isIsoInstant(value.observedAt)) return null;
  const capacity = parseCapacityValues(value);
  if (!capacity) return null;
  return { accountId: value.accountId, observedAt: value.observedAt, ...capacity };
};

const parseAccountRecord = (value: unknown): AccountRecord | null => {
  if (!isRecord(value) || !hasExactKeys(value, ['id', 'label', 'email', 'note', 'createdAt'])) return null;
  if (!isUuid(value.id) || !isLabel(value.label) || !isEmail(value.email) || !isNote(value.note) || !isIsoInstant(value.createdAt)) return null;
  return { id: value.id, label: value.label, email: value.email, note: value.note, createdAt: value.createdAt };
};

const parseCapacitySnapshot = (value: unknown): CapacitySnapshot | null => {
  if (!isRecord(value) || !hasExactKeys(value, ['accountId', 'source', 'observedAt', 'recordedAt', ...capacityKeys])) return null;
  if (!isUuid(value.accountId) || value.source !== 'manual' || !isIsoInstant(value.observedAt) || !isIsoInstant(value.recordedAt)) return null;
  const capacity = parseCapacityValues(value);
  if (!capacity) return null;
  return { accountId: value.accountId, source: 'manual', observedAt: value.observedAt, recordedAt: value.recordedAt, ...capacity };
};

/** Validates a complete registry, including cross-references. Returns null for anything unexpected. */
export const parseAccountsState = (value: unknown): AccountsState | null => {
  if (!isRecord(value) || !hasExactKeys(value, ['schemaVersion', 'accounts', 'reportedActiveAccountId', 'snapshots'])) return null;
  if (value.schemaVersion !== ACCOUNTS_SCHEMA_VERSION || !Array.isArray(value.accounts) || !Array.isArray(value.snapshots)) return null;

  const accounts = value.accounts.map(parseAccountRecord);
  const snapshots = value.snapshots.map(parseCapacitySnapshot);
  if (accounts.some((item) => item === null) || snapshots.some((item) => item === null)) return null;
  const validAccounts = accounts as AccountRecord[];
  const validSnapshots = snapshots as CapacitySnapshot[];

  const ids = new Set(validAccounts.map((account) => account.id));
  const emails = new Set(validAccounts.map((account) => normalizeEmail(account.email)));
  if (ids.size !== validAccounts.length || emails.size !== validAccounts.length) return null;
  if (!nullable(value.reportedActiveAccountId, isUuid)) return null;
  if (value.reportedActiveAccountId !== null && !ids.has(value.reportedActiveAccountId)) return null;
  if (validSnapshots.some((snapshot) => !ids.has(snapshot.accountId))) return null;
  for (const id of ids) {
    if (validSnapshots.filter((snapshot) => snapshot.accountId === id).length > MAX_SNAPSHOTS_PER_ACCOUNT) return null;
  }

  return {
    schemaVersion: ACCOUNTS_SCHEMA_VERSION,
    accounts: validAccounts,
    reportedActiveAccountId: value.reportedActiveAccountId,
    snapshots: validSnapshots
  };
};

/** Validates an IPC response. Error results are passed through only with a string code and message. */
export const parseAccountsResult = (value: unknown): Result<AccountsState> => {
  const invalid: Result<AccountsState> = {
    ok: false,
    error: { code: 'INVALID_ACCOUNTS_PAYLOAD', message: 'Account registry response failed validation.' }
  };
  if (!isRecord(value)) return invalid;
  if (value.ok === false) {
    const error = value.error;
    if (!isRecord(error) || typeof error.code !== 'string' || typeof error.message !== 'string') return invalid;
    return { ok: false, error: { code: error.code, message: error.message } };
  }
  if (value.ok !== true) return invalid;
  const state = parseAccountsState(value.data);
  return state ? { ok: true, data: state } : invalid;
};
