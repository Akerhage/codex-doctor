import { useState, type FormEvent } from 'react';
import type { ManualSnapshotInput, SubscriptionRenewal } from '../shared/accounts-contracts';
import {
  parseCountField,
  parseDateField,
  parseLocalDateTimeField,
  parsePercentField,
  renewalLabel,
  toLocalDateTimeInput,
  type FieldResult
} from './format';

type Fields = {
  observedAt: string;
  weeklyRemaining: string;
  weeklyResetsAt: string;
  fiveHourRemaining: string;
  fiveHourResetsAt: string;
  resetCredits: string;
  subscriptionEndsOn: string;
  subscriptionRenewal: SubscriptionRenewal;
};

const firstError = (results: FieldResult<unknown>[]): string | null => {
  for (const result of results) if (!result.ok) return result.message;
  return null;
};

/** Every field starts empty: earlier values are never carried forward as new observations. */
export function SnapshotForm({
  accountId,
  accountLabel,
  busy,
  onSubmit,
  onCancel
}: {
  accountId: string;
  accountLabel: string;
  busy: boolean;
  onSubmit: (input: ManualSnapshotInput) => void;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState<Fields>({
    observedAt: toLocalDateTimeInput(new Date()),
    weeklyRemaining: '',
    weeklyResetsAt: '',
    fiveHourRemaining: '',
    fiveHourResetsAt: '',
    resetCredits: '',
    subscriptionEndsOn: '',
    subscriptionRenewal: 'unknown'
  });
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof Fields) => (event: { target: { value: string } }) =>
    setFields((current) => ({ ...current, [key]: event.target.value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const observedAt = parseLocalDateTimeField(fields.observedAt, 'Observed at');
    const weeklyRemaining = parsePercentField(fields.weeklyRemaining, 'Weekly remaining');
    const weeklyResetsAt = parseLocalDateTimeField(fields.weeklyResetsAt, 'Weekly reset');
    const fiveHourRemaining = parsePercentField(fields.fiveHourRemaining, '5-hour remaining');
    const fiveHourResetsAt = parseLocalDateTimeField(fields.fiveHourResetsAt, '5-hour reset');
    const resetCredits = parseCountField(fields.resetCredits, 'Manual resets left');
    const subscriptionEndsOn = parseDateField(fields.subscriptionEndsOn, 'Subscription end date');

    const message = firstError([observedAt, weeklyRemaining, weeklyResetsAt, fiveHourRemaining, fiveHourResetsAt, resetCredits, subscriptionEndsOn]);
    if (message) { setError(message); return; }
    if (!observedAt.ok || observedAt.value === null) { setError('Observed at is required.'); return; }
    if (!weeklyRemaining.ok || !weeklyResetsAt.ok || !fiveHourRemaining.ok || !fiveHourResetsAt.ok || !resetCredits.ok || !subscriptionEndsOn.ok) return;

    setError(null);
    onSubmit({
      accountId,
      observedAt: observedAt.value,
      weeklyRemainingPercent: weeklyRemaining.value,
      weeklyResetsAt: weeklyResetsAt.value,
      fiveHourRemainingPercent: fiveHourRemaining.value,
      fiveHourResetsAt: fiveHourResetsAt.value,
      resetCreditsRemaining: resetCredits.value,
      subscriptionEndsOn: subscriptionEndsOn.value,
      subscriptionRenewal: fields.subscriptionRenewal
    });
  };

  const id = (name: string) => `snapshot-${accountId}-${name}`;

  return (
    <form className="account-form" onSubmit={submit} aria-label={`Report values for ${accountLabel}`} noValidate>
      <p className="account-form__hint">Enter only what you can see right now. Leave a field empty when you do not know it; it will be shown as unknown.</p>
      <div className="account-form__grid">
        <label htmlFor={id('observed')}>
          Observed at
          <input id={id('observed')} type="datetime-local" value={fields.observedAt} required onChange={set('observedAt')} />
        </label>
        <label htmlFor={id('credits')}>
          Manual resets left
          <input id={id('credits')} inputMode="numeric" value={fields.resetCredits} onChange={set('resetCredits')} />
        </label>
        <label htmlFor={id('weekly')}>
          Weekly remaining (%)
          <input id={id('weekly')} inputMode="numeric" value={fields.weeklyRemaining} onChange={set('weeklyRemaining')} />
        </label>
        <label htmlFor={id('weekly-reset')}>
          Weekly reset
          <input id={id('weekly-reset')} type="datetime-local" value={fields.weeklyResetsAt} onChange={set('weeklyResetsAt')} />
        </label>
        <label htmlFor={id('five')}>
          5-hour remaining (%)
          <input id={id('five')} inputMode="numeric" value={fields.fiveHourRemaining} onChange={set('fiveHourRemaining')} />
        </label>
        <label htmlFor={id('five-reset')}>
          5-hour reset
          <input id={id('five-reset')} type="datetime-local" value={fields.fiveHourResetsAt} onChange={set('fiveHourResetsAt')} />
        </label>
        <label htmlFor={id('sub-end')}>
          Subscription end date
          <input id={id('sub-end')} type="date" value={fields.subscriptionEndsOn} onChange={set('subscriptionEndsOn')} />
        </label>
        <label htmlFor={id('renewal')}>
          Renewal status
          <select id={id('renewal')} value={fields.subscriptionRenewal} onChange={set('subscriptionRenewal')}>
            {(Object.keys(renewalLabel) as SubscriptionRenewal[]).map((value) => (
              <option key={value} value={value}>{renewalLabel[value]}</option>
            ))}
          </select>
        </label>
      </div>
      {error && <div className="notice notice--warning" role="alert">{error}</div>}
      <div className="account-form__actions">
        <button className="diagnostic-refresh" type="submit" disabled={busy}>Save values</button>
        <button className="account-button--quiet" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}
