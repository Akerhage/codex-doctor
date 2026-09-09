import { describe, expect, it } from 'vitest';
import { isPathWithinRoot } from '../electron/services/windows-diagnostics';
import { compareProcessSets } from '../src/shared/process-delta';
import { parseSnapshotResult } from '../src/shared/validation';
import type { WindowsDiagnosticSnapshot } from '../src/shared/contracts';

describe('isPathWithinRoot', () => {
  it('accepts a process path inside the discovered installation root', () => {
    expect(isPathWithinRoot(
      'C:\\Program Files\\WindowsApps\\OpenAI.Codex_1.2.3_x64\\Codex.exe',
      'C:\\Program Files\\WindowsApps\\OpenAI.Codex_1.2.3_x64'
    )).toBe(true);
  });

  it('rejects prefix collisions and unrelated paths', () => {
    expect(isPathWithinRoot(
      'C:\\Program Files\\WindowsApps\\OpenAI.Codex_1.2.3_x64-copy\\Codex.exe',
      'C:\\Program Files\\WindowsApps\\OpenAI.Codex_1.2.3_x64'
    )).toBe(false);
    expect(isPathWithinRoot('C:\\Windows\\System32\\notepad.exe', 'C:\\Program Files\\Codex')).toBe(false);
  });
});

describe('parseSnapshotResult M2', () => {
  const validPayload = {
    ok: true,
    data: {
      source: 'windows-readonly',
      collectedAt: '2026-09-09T12:00:00.000Z',
      installation: {
        state: 'detected',
        detail: 'One candidate.',
        candidates: [{
          source: 'appx',
          identity: 'OpenAI.Codex',
          version: '1.2.3',
          installLocation: 'C:\\Program Files\\WindowsApps\\OpenAI.Codex_1.2.3_x64'
        }]
      },
      processes: {
        state: 'detected',
        detail: 'One owned process.',
        items: [{
          pid: 100,
          parentPid: 50,
          name: 'Codex.exe',
          executablePath: 'C:\\Program Files\\WindowsApps\\OpenAI.Codex_1.2.3_x64\\Codex.exe',
          matchedInstallLocation: 'C:\\Program Files\\WindowsApps\\OpenAI.Codex_1.2.3_x64'
        }]
      },
      activeJobState: 'unknown',
      observations: [{ id: 'active-job', label: 'Active job state', status: 'unknown', detail: 'Unknown.' }]
    }
  };

  it('accepts a valid live read-only snapshot', () => {
    const result = parseSnapshotResult(validPayload);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.source).toBe('windows-readonly');
  });

  it('rejects live snapshots that claim a known active-job state', () => {
    const payload = structuredClone(validPayload);
    payload.data.activeJobState = 'active';
    expect(parseSnapshotResult(payload).ok).toBe(false);
  });

  it('rejects malformed process identifiers', () => {
    const payload = structuredClone(validPayload);
    payload.data.processes.items[0].pid = -1;
    expect(parseSnapshotResult(payload).ok).toBe(false);
  });
});

describe('compareProcessSets', () => {
  const makeSnapshot = (collectedAt: string, pids: number[]): WindowsDiagnosticSnapshot => ({
    source: 'windows-readonly',
    collectedAt,
    installation: {
      state: 'detected',
      detail: 'Detected.',
      candidates: [{
        source: 'appx',
        identity: 'OpenAI.Codex',
        version: '1.2.3',
        installLocation: 'C:\\Program Files\\WindowsApps\\OpenAI.Codex_1.2.3_x64'
      }]
    },
    processes: {
      state: pids.length > 0 ? 'detected' : 'none',
      detail: 'Observed.',
      items: pids.map((pid) => ({
        pid,
        parentPid: 1,
        name: 'ChatGPT.exe',
        executablePath: `C:\\Program Files\\WindowsApps\\OpenAI.Codex_1.2.3_x64\\${pid}\\ChatGPT.exe`,
        matchedInstallLocation: 'C:\\Program Files\\WindowsApps\\OpenAI.Codex_1.2.3_x64'
      }))
    },
    activeJobState: 'unknown',
    observations: []
  });

  it('reports appeared and disappeared PIDs without inferring job state', () => {
    const previous = makeSnapshot('2026-09-09T12:00:00.000Z', [10, 20, 30]);
    const current = makeSnapshot('2026-09-09T12:01:00.000Z', [20, 30, 40]);

    expect(compareProcessSets(previous, current)).toEqual({
      previousCollectedAt: previous.collectedAt,
      currentCollectedAt: current.collectedAt,
      startedPids: [40],
      stoppedPids: [10]
    });
  });

  it('reports an unchanged PID set as an empty delta', () => {
    const previous = makeSnapshot('2026-09-09T12:00:00.000Z', [10, 20]);
    const current = makeSnapshot('2026-09-09T12:01:00.000Z', [20, 10]);

    expect(compareProcessSets(previous, current).startedPids).toEqual([]);
    expect(compareProcessSets(previous, current).stoppedPids).toEqual([]);
  });
});
