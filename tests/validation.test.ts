import { describe, expect, it } from 'vitest';
import { parseEnvironmentResult, parseSnapshotResult } from '../src/shared/validation';

describe('parseEnvironmentResult', () => {
  it('accepts a valid environment payload', () => {
    const result = parseEnvironmentResult({
      ok: true,
      data: {
        doctorVersion: '0.1.0-alpha.1',
        platform: 'win32',
        architecture: 'x64',
        runtime: { electron: '44.3.0', chrome: 'x', node: 'x' }
      }
    });

    expect(result.ok).toBe(true);
  });

  it('rejects malformed payloads', () => {
    const result = parseEnvironmentResult({ ok: true, data: { doctorVersion: 42 } });
    expect(result.ok).toBe(false);
  });
});

describe('parseSnapshotResult', () => {
  it('accepts a valid mock snapshot', () => {
    const result = parseSnapshotResult({
      ok: true,
      data: {
        source: 'mock',
        collectedAt: new Date().toISOString(),
        observations: [
          { id: 'job', label: 'Active job state', status: 'unknown', detail: 'Not verified.' }
        ]
      }
    });

    expect(result.ok).toBe(true);
  });

  it('rejects unsupported statuses', () => {
    const result = parseSnapshotResult({
      ok: true,
      data: {
        source: 'mock',
        collectedAt: new Date().toISOString(),
        observations: [
          { id: 'job', label: 'Active job state', status: 'great', detail: 'Invalid.' }
        ]
      }
    });

    expect(result.ok).toBe(false);
  });
});
