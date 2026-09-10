import { describe, expect, it } from 'vitest';
import { classifyCollectorFailure, collectorFailureDetail } from '../electron/services/collector-failure';

describe('collector failure classification', () => {
  it('classifies killed child-process errors as timeouts without exposing raw error content', () => {
    const error = { killed: true, signal: 'SIGTERM', stderr: 'sensitive raw stderr' };
    const kind = classifyCollectorFailure(error);

    expect(kind).toBe('timeout');
    expect(collectorFailureDetail(kind, 7_500)).toBe(
      'The bounded Windows discovery collector exceeded its 7500 ms execution limit before valid evidence was produced.'
    );
    expect(collectorFailureDetail(kind, 7_500)).not.toContain('sensitive raw stderr');
  });

  it('classifies non-timeout child-process exits without echoing exit details', () => {
    const error = { code: 1, stderr: 'private path or shell output' };
    const kind = classifyCollectorFailure(error);

    expect(kind).toBe('powershell-exit');
    expect(collectorFailureDetail(kind, 7_500)).toBe(
      'The bounded Windows discovery collector exited unsuccessfully before valid evidence was produced.'
    );
    expect(collectorFailureDetail(kind, 7_500)).not.toContain('private path or shell output');
  });

  it('classifies JSON syntax failures as invalid output', () => {
    const kind = classifyCollectorFailure(new SyntaxError('Unexpected token'));
    expect(kind).toBe('invalid-output');
    expect(collectorFailureDetail(kind, 7_500)).toBe(
      'The bounded Windows discovery collector returned output that could not be validated as JSON evidence.'
    );
  });

  it('keeps unknown failures generic', () => {
    const kind = classifyCollectorFailure(new Error('secret detail'));
    expect(kind).toBe('unknown');
    expect(collectorFailureDetail(kind, 7_500)).toBe(
      'The bounded Windows discovery collector failed for an unclassified reason before valid evidence was produced.'
    );
    expect(collectorFailureDetail(kind, 7_500)).not.toContain('secret detail');
  });
});
