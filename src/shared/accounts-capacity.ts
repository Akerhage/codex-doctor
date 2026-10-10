import type { AccountsState, CapacitySnapshot, SubscriptionRenewal } from './accounts-contracts.js';

// Classifies manually reported values against the current time. It never estimates a
// missing value, never judges a value unusable because of its age and never produces a
// recommendation. Age is reported separately (`ageMs`) for the user to weigh.

/**
 * known    – reported by the user (not verified live);
 * unknown  – not reported;
 * elapsed  – the reported reset time or date has passed. The reported percentage is kept as
 *            reported; Doctor does not assume the window was restored to 100 %.
 */
export type ValueState = 'known' | 'unknown' | 'elapsed';

export interface ClassifiedValue<T> {
  value: T | null;
  state: ValueState;
}

export interface LimitWindowAssessment {
  remainingPercent: ClassifiedValue<number>;
  resetsAt: ClassifiedValue<string>;
}

export interface CapacityAssessment {
  observedAt: string;
  ageMs: number;
  weekly: LimitWindowAssessment;
  fiveHour: LimitWindowAssessment;
  resetCredits: ClassifiedValue<number>;
  subscription: {
    endsOn: ClassifiedValue<string>;
    renewal: SubscriptionRenewal;
  };
}

const classifyWindow = (
  remainingPercent: number | null,
  resetsAt: string | null,
  now: Date
): LimitWindowAssessment => {
  const resetElapsed = resetsAt !== null && Date.parse(resetsAt) <= now.getTime();
  const resetState: ValueState = resetsAt === null ? 'unknown' : resetElapsed ? 'elapsed' : 'known';

  let percentState: ValueState;
  if (remainingPercent === null) percentState = 'unknown';
  else if (resetElapsed) percentState = 'elapsed';
  else percentState = 'known';

  return {
    remainingPercent: { value: remainingPercent, state: percentState },
    resetsAt: { value: resetsAt, state: resetState }
  };
};

/** Compares calendar dates in the viewer's local time zone. */
const localDateKey = (date: Date): string => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const assessCapacity = (snapshot: CapacitySnapshot, now: Date): CapacityAssessment => {
  const ageMs = Math.max(0, now.getTime() - Date.parse(snapshot.observedAt));

  const resetCreditsState: ValueState = snapshot.resetCreditsRemaining === null ? 'unknown' : 'known';

  const endsOnState: ValueState = snapshot.subscriptionEndsOn === null
    ? 'unknown'
    : snapshot.subscriptionEndsOn < localDateKey(now) ? 'elapsed' : 'known';

  return {
    observedAt: snapshot.observedAt,
    ageMs,
    weekly: classifyWindow(snapshot.weeklyRemainingPercent, snapshot.weeklyResetsAt, now),
    fiveHour: classifyWindow(snapshot.fiveHourRemainingPercent, snapshot.fiveHourResetsAt, now),
    resetCredits: { value: snapshot.resetCreditsRemaining, state: resetCreditsState },
    subscription: {
      endsOn: { value: snapshot.subscriptionEndsOn, state: endsOnState },
      renewal: snapshot.subscriptionRenewal
    }
  };
};

/** The newest snapshot by observation time, or null when the account has none. */
export const latestSnapshot = (state: AccountsState, accountId: string): CapacitySnapshot | null => {
  let latest: CapacitySnapshot | null = null;
  for (const snapshot of state.snapshots) {
    if (snapshot.accountId !== accountId) continue;
    if (!latest || Date.parse(snapshot.observedAt) >= Date.parse(latest.observedAt)) latest = snapshot;
  }
  return latest;
};
