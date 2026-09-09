import { app, ipcMain } from 'electron';
import type { DiagnosticSnapshot, EnvironmentInfo, MockDiagnosticSnapshot, Result } from '../../src/shared/contracts.js';
import { collectWindowsDiagnostics } from '../services/windows-diagnostics.js';

const ok = <T>(data: T): Result<T> => ({ ok: true, data });

export const registerIpcHandlers = (): void => {
  ipcMain.handle('doctor:get-environment', (): Result<EnvironmentInfo> => {
    return ok({
      doctorVersion: app.getVersion(),
      platform: process.platform,
      architecture: process.arch,
      runtime: {
        electron: process.versions.electron ?? 'unknown',
        chrome: process.versions.chrome ?? 'unknown',
        node: process.versions.node
      }
    });
  });

  ipcMain.handle('doctor:get-mock-snapshot', (): Result<MockDiagnosticSnapshot> => {
    return ok({
      source: 'mock',
      collectedAt: new Date().toISOString(),
      observations: [
        {
          id: 'desktop-ui',
          label: 'Codex Desktop UI',
          status: 'mock',
          detail: 'Mock observation only. Live Windows diagnostics are available through the M2 collector.'
        },
        {
          id: 'active-job',
          label: 'Active job state',
          status: 'unknown',
          detail: 'Doctor does not infer active work from process presence.'
        },
        {
          id: 'recovery',
          label: 'Recovery engine',
          status: 'unavailable',
          detail: 'Recovery actions remain intentionally disabled in M2.'
        }
      ]
    });
  });

  ipcMain.handle('doctor:get-diagnostic-snapshot', async (): Promise<Result<DiagnosticSnapshot>> => {
    return ok(await collectWindowsDiagnostics());
  });
};
