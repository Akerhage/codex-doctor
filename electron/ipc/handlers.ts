import { app, ipcMain } from 'electron';
import type { DiagnosticSnapshot, EnvironmentInfo, Result } from '../../src/shared/contracts.js';

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

  ipcMain.handle('doctor:get-mock-snapshot', (): Result<DiagnosticSnapshot> => {
    return ok({
      source: 'mock',
      collectedAt: new Date().toISOString(),
      observations: [
        {
          id: 'desktop-ui',
          label: 'Codex Desktop UI',
          status: 'mock',
          detail: 'Mock observation only. Real process discovery is not implemented.'
        },
        {
          id: 'active-job',
          label: 'Active job state',
          status: 'unknown',
          detail: 'Doctor cannot yet verify whether Codex has an active task.'
        },
        {
          id: 'recovery',
          label: 'Recovery engine',
          status: 'unavailable',
          detail: 'Recovery actions are intentionally disabled in Sprint 1.'
        }
      ]
    });
  });
};
