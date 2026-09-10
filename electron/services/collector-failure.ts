export type CollectorFailureKind = 'timeout' | 'powershell-exit' | 'invalid-output' | 'unknown';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const classifyCollectorFailure = (error: unknown): CollectorFailureKind => {
  if (error instanceof SyntaxError) return 'invalid-output';
  if (!isRecord(error)) return 'unknown';

  if (error.killed === true) return 'timeout';
  if (typeof error.code === 'number' || typeof error.code === 'string' || typeof error.signal === 'string') {
    return 'powershell-exit';
  }

  return 'unknown';
};

export const collectorFailureDetail = (kind: CollectorFailureKind, timeoutMs: number): string => {
  if (kind === 'timeout') {
    return `The bounded Windows discovery collector exceeded its ${timeoutMs} ms execution limit before valid evidence was produced.`;
  }
  if (kind === 'powershell-exit') {
    return 'The bounded Windows discovery collector exited unsuccessfully before valid evidence was produced.';
  }
  if (kind === 'invalid-output') {
    return 'The bounded Windows discovery collector returned output that could not be validated as JSON evidence.';
  }
  return 'The bounded Windows discovery collector failed for an unclassified reason before valid evidence was produced.';
};
