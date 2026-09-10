import type { WindowsDiagnosticSnapshot } from './contracts.js';

export interface ProcessDelta {
  previousCollectedAt: string;
  currentCollectedAt: string;
  startedPids: number[];
  stoppedPids: number[];
}

const isComparableProcessState = (state: WindowsDiagnosticSnapshot['processes']['state']): boolean =>
  state === 'detected' || state === 'none';

export const compareProcessSets = (
  previous: WindowsDiagnosticSnapshot,
  current: WindowsDiagnosticSnapshot
): ProcessDelta | null => {
  if (!isComparableProcessState(previous.processes.state) || !isComparableProcessState(current.processes.state)) {
    return null;
  }

  const previousPids = new Set(previous.processes.items.map((process) => process.pid));
  const currentPids = new Set(current.processes.items.map((process) => process.pid));

  return {
    previousCollectedAt: previous.collectedAt,
    currentCollectedAt: current.collectedAt,
    startedPids: [...currentPids].filter((pid) => !previousPids.has(pid)).sort((a, b) => a - b),
    stoppedPids: [...previousPids].filter((pid) => !currentPids.has(pid)).sort((a, b) => a - b)
  };
};
