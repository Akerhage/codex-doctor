import { describe, expect, it } from 'vitest';
import { assessCapacity, latestSnapshot } from '../src/shared/accounts-capacity';
import { ACCOUNT_A, ACCOUNT_B, baseState, snapshot } from './accounts-fixtures';

const at = (iso: string) => new Date(iso);

describe('assessCapacity', () => {
  it('keeps every unreported value unknown', () => {
    const result = assessCapacity(snapshot(), at('2026-10-10T08:30:00Z'));
    expect(result.weekly.remainingPercent).toEqual({ value: null, state: 'unknown' });
    expect(result.weekly.resetsAt).toEqual({ value: null, state: 'unknown' });
    expect(result.fiveHour.remainingPercent.state).toBe('unknown');
    expect(result.resetCredits).toEqual({ value: null, state: 'unknown' });
    expect(result.subscription.endsOn).toEqual({ value: null, state: 'unknown' });
    expect(result.subscription.renewal).toBe('unknown');
  });

  it('reports fresh values as known without changing them', () => {
    const result = assessCapacity(snapshot({
      weeklyRemainingPercent: 0,
      weeklyResetsAt: '2026-10-14T08:00:00Z',
      fiveHourRemainingPercent: 100,
      resetCreditsRemaining: 0
    }), at('2026-10-10T09:00:00Z'));
    expect(result.weekly.remainingPercent).toEqual({ value: 0, state: 'known' });
    expect(result.fiveHour.remainingPercent).toEqual({ value: 100, state: 'known' });
    expect(result.resetCredits).toEqual({ value: 0, state: 'known' });
    expect(result.ageMs).toBe(60 * 60 * 1000);
  });

  it('marks a percentage elapsed once its reset time has passed, without assuming 100 %', () => {
    const result = assessCapacity(snapshot({
      weeklyRemainingPercent: 8,
      weeklyResetsAt: '2026-10-10T09:00:00Z'
    }), at('2026-10-10T09:00:00Z'));
    expect(result.weekly.remainingPercent).toEqual({ value: 8, state: 'elapsed' });
    expect(result.weekly.resetsAt.state).toBe('elapsed');
  });

  it('marks the 5-hour value outdated after five hours and the weekly value after a day', () => {
    const values = snapshot({ weeklyRemainingPercent: 50, fiveHourRemainingPercent: 50, resetCreditsRemaining: 1 });
    const sixHours = assessCapacity(values, at('2026-10-10T14:00:00Z'));
    expect(sixHours.fiveHour.remainingPercent.state).toBe('stale');
    expect(sixHours.weekly.remainingPercent.state).toBe('known');

    const twoDays = assessCapacity(values, at('2026-10-12T08:00:01Z'));
    expect(twoDays.weekly.remainingPercent.state).toBe('stale');
    expect(twoDays.resetCredits.state).toBe('stale');
  });

  it('flags a passed subscription date without inferring that the subscription ended', () => {
    const result = assessCapacity(snapshot({ subscriptionEndsOn: '2026-10-09', subscriptionRenewal: 'unknown' }), at('2026-10-10T12:00:00'));
    expect(result.subscription.endsOn).toEqual({ value: '2026-10-09', state: 'elapsed' });
    expect(result.subscription.renewal).toBe('unknown');
  });

  it('treats a future observation as zero age', () => {
    expect(assessCapacity(snapshot({ observedAt: '2026-10-10T08:04:00Z' }), at('2026-10-10T08:00:00Z')).ageMs).toBe(0);
  });
});

describe('latestSnapshot', () => {
  it('returns the newest observation for the account only', () => {
    const state = {
      ...baseState(),
      snapshots: [
        snapshot({ observedAt: '2026-10-10T10:00:00.000Z', weeklyRemainingPercent: 40 }),
        snapshot({ observedAt: '2026-10-09T10:00:00.000Z', weeklyRemainingPercent: 60 }),
        snapshot({ accountId: ACCOUNT_B, observedAt: '2026-10-11T10:00:00.000Z', weeklyRemainingPercent: 90 })
      ]
    };
    expect(latestSnapshot(state, ACCOUNT_A)?.weeklyRemainingPercent).toBe(40);
    expect(latestSnapshot({ ...state, snapshots: [] }, ACCOUNT_A)).toBeNull();
  });
});
