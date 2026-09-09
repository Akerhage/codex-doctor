import { describe, expect, it } from 'vitest';
import { isPathWithinRoot } from '../electron/services/windows-diagnostics';
import { parseSnapshotResult } from '../src/shared/validation';

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
