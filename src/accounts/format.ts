import type { SubscriptionRenewal } from '../shared/accounts-contracts';
import type { ValueState } from '../shared/accounts-capacity';

// Pure helpers that turn form text into contract values and contract values into labels.

export type FieldResult<T> = { ok: true; value: T | null } | { ok: false; message: string };

const parseIntegerField = (text: string, max: number, label: string): FieldResult<number> => {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { ok: true, value: null };
  if (!/^\d+$/.test(trimmed)) return { ok: false, message: `${label} must be a whole number or left empty.` };
  const value = Number(trimmed);
  if (value > max) return { ok: false, message: `${label} must be between 0 and ${max}.` };
  return { ok: true, value };
};

export const parsePercentField = (text: string, label: string): FieldResult<number> => parseIntegerField(text, 100, label);

export const parseCountField = (text: string, label: string): FieldResult<number> => parseIntegerField(text, 99, label);

/** `datetime-local` values have no offset and are interpreted in the viewer's time zone. */
export const parseLocalDateTimeField = (text: string, label: string): FieldResult<string> => {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { ok: true, value: null };
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) return { ok: false, message: `${label} is not a valid date and time.` };
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return { ok: false, message: `${label} is not a valid date and time.` };
  return { ok: true, value: parsed.toISOString() };
};

export const parseDateField = (text: string, label: string): FieldResult<string> => {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { ok: true, value: null };
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return { ok: false, message: `${label} is not a valid date.` };
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (date.getUTCDate() !== Number(match[3]) || date.getUTCMonth() !== Number(match[2]) - 1) {
    return { ok: false, message: `${label} is not a valid date.` };
  }
  return { ok: true, value: trimmed };
};

export const toLocalDateTimeInput = (date: Date): string => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const formatAge = (ageMs: number): string => {
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} days ago`;
};

export const formatInstant = (iso: string): string => new Date(iso).toLocaleString();

export const valueStateLabel: Record<ValueState, string> = {
  known: 'Reported',
  unknown: 'Unknown',
  stale: 'Outdated',
  elapsed: 'Reset passed'
};

export const renewalLabel: Record<SubscriptionRenewal, string> = {
  renewed: 'Renewed',
  pending: 'Not yet renewed',
  unknown: 'Renewal unknown'
};
