import { useState } from 'react';
import type { AccountRecord, CapacitySnapshot } from '../shared/accounts-contracts';
import { assessCapacity, type ClassifiedValue, type LimitWindowAssessment } from '../shared/accounts-capacity';
import { formatAge, formatInstant, renewalLabel, valueStateLabel } from './format';

function StateBadge({ state }: { state: ClassifiedValue<unknown>['state'] }) {
  return <span className={`value-state value-state--${state}`}>{valueStateLabel[state]}</span>;
}

function ReportedAge({ state, ageMs }: { state: ClassifiedValue<unknown>['state']; ageMs: number | null }) {
  if (state === 'unknown' || ageMs === null) return null;
  return <small className="capacity-row__age">reported {formatAge(ageMs)}</small>;
}

function WindowRow({ label, window, ageMs }: { label: string; window: LimitWindowAssessment | null; ageMs: number | null }) {
  const percent = window?.remainingPercent ?? { value: null, state: 'unknown' as const };
  const reset = window?.resetsAt ?? { value: null, state: 'unknown' as const };
  return (
    <div className="capacity-row">
      <dt>{label}</dt>
      <dd>
        <strong>{percent.value === null ? 'Unknown' : `${percent.value} % left`}</strong>
        <StateBadge state={percent.state} />
        <ReportedAge state={percent.state} ageMs={ageMs} />
        <small>{reset.value === null ? 'Next reset unknown' : `Resets ${formatInstant(reset.value)}`}{reset.state === 'elapsed' ? ' (passed)' : ''}</small>
      </dd>
    </div>
  );
}

export function AccountCard({
  account,
  snapshot,
  reportedActive,
  now,
  busy,
  onEdit,
  onReport,
  onSetActive,
  onRemove
}: {
  account: AccountRecord;
  snapshot: CapacitySnapshot | null;
  reportedActive: boolean;
  now: Date;
  busy: boolean;
  onEdit: () => void;
  onReport: () => void;
  onSetActive: () => void;
  onRemove: () => void;
}) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const assessment = snapshot ? assessCapacity(snapshot, now) : null;
  const credits = assessment?.resetCredits ?? { value: null, state: 'unknown' as const };
  const endsOn = assessment?.subscription.endsOn ?? { value: null, state: 'unknown' as const };

  return (
    <article className={reportedActive ? 'account-card account-card--active' : 'account-card'} aria-label={account.label}>
      <header className="account-card__header">
        <div>
          <h3>{account.label}</h3>
          <small>{account.email}</small>
          {account.note && <p>{account.note}</p>}
        </div>
        {reportedActive && <span className="value-state value-state--active">Active (reported by you)</span>}
      </header>

      <dl className="capacity-list">
        <WindowRow label="Weekly" window={assessment?.weekly ?? null} ageMs={assessment?.ageMs ?? null} />
        <WindowRow label="5-hour" window={assessment?.fiveHour ?? null} ageMs={assessment?.ageMs ?? null} />
        <div className="capacity-row">
          <dt>Manual resets</dt>
          <dd>
            <strong>{credits.value === null ? 'Unknown' : `${credits.value} left`}</strong>
            <StateBadge state={credits.state} />
            <ReportedAge state={credits.state} ageMs={assessment?.ageMs ?? null} />
          </dd>
        </div>
        <div className="capacity-row">
          <dt>Subscription</dt>
          <dd>
            <strong>{endsOn.value === null ? 'End date unknown' : `Ends ${endsOn.value}`}</strong>
            {endsOn.state === 'elapsed' && <span className="value-state value-state--elapsed">Date passed</span>}
            <small>{assessment ? renewalLabel[assessment.subscription.renewal] : 'Renewal unknown'}</small>
          </dd>
        </div>
      </dl>

      <p className="account-card__provenance">
        {assessment
          ? <>Source: manual entry, not verified live · observed {formatInstant(assessment.observedAt)} ({formatAge(assessment.ageMs)})</>
          : <>No values reported yet. Everything is unknown.</>}
      </p>

      <div className="account-card__actions">
        <button className="diagnostic-refresh" type="button" onClick={onReport} disabled={busy}>Report values</button>
        <button className="account-button--quiet" type="button" onClick={onEdit} disabled={busy}>Edit</button>
        {!reportedActive && (
          <button className="account-button--quiet" type="button" onClick={onSetActive} disabled={busy}>Mark as active</button>
        )}
        {confirmingRemove ? (
          <>
            <button className="account-button--danger" type="button" onClick={onRemove} disabled={busy}>Confirm removal</button>
            <button className="account-button--quiet" type="button" onClick={() => setConfirmingRemove(false)} disabled={busy}>Keep</button>
          </>
        ) : (
          <button className="account-button--quiet" type="button" onClick={() => setConfirmingRemove(true)} disabled={busy}>Remove</button>
        )}
      </div>
    </article>
  );
}
