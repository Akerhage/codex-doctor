const { contextBridge, ipcRenderer } = require('electron') as typeof import('electron');

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

type EnvironmentInfo = {
  doctorVersion: string;
  platform: string;
  architecture: string;
  runtime: { electron: string; chrome: string; node: string };
};

type DiagnosticStatus = 'healthy' | 'warning' | 'failed' | 'unknown' | 'unavailable' | 'mock';

type DiagnosticSnapshot = {
  source: 'mock';
  collectedAt: string;
  observations: Array<{ id: string; label: string; status: DiagnosticStatus; detail: string }>;
};

const statuses: readonly DiagnosticStatus[] = ['healthy', 'warning', 'failed', 'unknown', 'unavailable', 'mock'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';

const parseEnvironmentResult = (value: unknown): Result<EnvironmentInfo> => {
  if (!isRecord(value) || value.ok !== true || !isRecord(value.data)) {
    return { ok: false, error: { code: 'INVALID_ENVIRONMENT_PAYLOAD', message: 'Environment response failed validation.' } };
  }

  const data = value.data;
  if (!isString(data.doctorVersion) || !isString(data.platform) || !isString(data.architecture) || !isRecord(data.runtime)) {
    return { ok: false, error: { code: 'INVALID_ENVIRONMENT_PAYLOAD', message: 'Environment response failed validation.' } };
  }
  if (!isString(data.runtime.electron) || !isString(data.runtime.chrome) || !isString(data.runtime.node)) {
    return { ok: false, error: { code: 'INVALID_ENVIRONMENT_PAYLOAD', message: 'Environment response failed validation.' } };
  }

  return {
    ok: true,
    data: {
      doctorVersion: data.doctorVersion,
      platform: data.platform,
      architecture: data.architecture,
      runtime: {
        electron: data.runtime.electron,
        chrome: data.runtime.chrome,
        node: data.runtime.node
      }
    }
  };
};

const parseSnapshotResult = (value: unknown): Result<DiagnosticSnapshot> => {
  if (!isRecord(value) || value.ok !== true || !isRecord(value.data)) {
    return { ok: false, error: { code: 'INVALID_SNAPSHOT_PAYLOAD', message: 'Diagnostic response failed validation.' } };
  }

  const data = value.data;
  if (data.source !== 'mock' || !isString(data.collectedAt) || Number.isNaN(Date.parse(data.collectedAt)) || !Array.isArray(data.observations)) {
    return { ok: false, error: { code: 'INVALID_SNAPSHOT_PAYLOAD', message: 'Diagnostic response failed validation.' } };
  }

  const observations = data.observations.map((item) => {
    if (!isRecord(item) || !isString(item.id) || !isString(item.label) || !isString(item.status) || !statuses.includes(item.status as DiagnosticStatus) || !isString(item.detail)) {
      return null;
    }
    return { id: item.id, label: item.label, status: item.status as DiagnosticStatus, detail: item.detail };
  });

  if (observations.some((item) => item === null)) {
    return { ok: false, error: { code: 'INVALID_SNAPSHOT_PAYLOAD', message: 'Diagnostic response failed validation.' } };
  }

  return {
    ok: true,
    data: {
      source: 'mock',
      collectedAt: data.collectedAt,
      observations: observations as DiagnosticSnapshot['observations']
    }
  };
};

contextBridge.exposeInMainWorld('doctor', {
  getEnvironment: async () => parseEnvironmentResult(await ipcRenderer.invoke('doctor:get-environment')),
  getMockSnapshot: async () => parseSnapshotResult(await ipcRenderer.invoke('doctor:get-mock-snapshot'))
});
