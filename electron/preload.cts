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
type Observation = { id: string; label: string; status: DiagnosticStatus; detail: string };
type Installation = { source: 'appx' | 'uninstall-registry'; identity: string; version: string | null; installLocation: string };
type OwnedProcess = { pid: number; parentPid: number; name: string; executablePath: string; matchedInstallLocation: string };

type DiagnosticSnapshot =
  | { source: 'mock'; collectedAt: string; observations: Observation[] }
  | {
      source: 'windows-readonly';
      collectedAt: string;
      installation: { state: 'detected' | 'not-detected' | 'unavailable' | 'error'; candidates: Installation[]; detail: string };
      processes: { state: 'detected' | 'none' | 'unavailable' | 'error'; items: OwnedProcess[]; detail: string };
      activeJobState: 'unknown';
      observations: Observation[];
    };

const statuses: readonly DiagnosticStatus[] = ['healthy', 'warning', 'failed', 'unknown', 'unavailable', 'mock'];
const installationStates = ['detected', 'not-detected', 'unavailable', 'error'] as const;
const processStates = ['detected', 'none', 'unavailable', 'error'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string';
const isNullableString = (value: unknown): value is string | null => value === null || isString(value);
const isInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;

const parseObservation = (value: unknown): Observation | null => {
  if (!isRecord(value) || !isString(value.id) || !isString(value.label) || !isString(value.status) || !statuses.includes(value.status as DiagnosticStatus) || !isString(value.detail)) return null;
  return { id: value.id, label: value.label, status: value.status as DiagnosticStatus, detail: value.detail };
};

const parseObservations = (value: unknown): Observation[] | null => {
  if (!Array.isArray(value)) return null;
  const parsed = value.map(parseObservation);
  return parsed.some((item) => item === null) ? null : parsed as Observation[];
};

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

  return { ok: true, data: {
    doctorVersion: data.doctorVersion,
    platform: data.platform,
    architecture: data.architecture,
    runtime: { electron: data.runtime.electron, chrome: data.runtime.chrome, node: data.runtime.node }
  } };
};

const parseSnapshotResult = (value: unknown): Result<DiagnosticSnapshot> => {
  if (!isRecord(value) || value.ok !== true || !isRecord(value.data) || !isString(value.data.collectedAt) || Number.isNaN(Date.parse(value.data.collectedAt))) {
    return { ok: false, error: { code: 'INVALID_SNAPSHOT_PAYLOAD', message: 'Diagnostic response failed validation.' } };
  }

  const data = value.data;
  const observations = parseObservations(data.observations);
  if (!observations) return { ok: false, error: { code: 'INVALID_SNAPSHOT_PAYLOAD', message: 'Diagnostic response failed validation.' } };

  if (data.source === 'mock') {
    return { ok: true, data: { source: 'mock', collectedAt: data.collectedAt, observations } };
  }

  if (data.source !== 'windows-readonly' || !isRecord(data.installation) || !isRecord(data.processes) || data.activeJobState !== 'unknown') {
    return { ok: false, error: { code: 'INVALID_SNAPSHOT_PAYLOAD', message: 'Diagnostic response failed validation.' } };
  }
  if (!installationStates.includes(data.installation.state as typeof installationStates[number]) || !processStates.includes(data.processes.state as typeof processStates[number])) {
    return { ok: false, error: { code: 'INVALID_SNAPSHOT_PAYLOAD', message: 'Diagnostic response failed validation.' } };
  }
  if (!isString(data.installation.detail) || !isString(data.processes.detail) || !Array.isArray(data.installation.candidates) || !Array.isArray(data.processes.items)) {
    return { ok: false, error: { code: 'INVALID_SNAPSHOT_PAYLOAD', message: 'Diagnostic response failed validation.' } };
  }

  const candidates = data.installation.candidates.map((item): Installation | null => {
    if (!isRecord(item) || (item.source !== 'appx' && item.source !== 'uninstall-registry') || !isString(item.identity) || !isNullableString(item.version) || !isString(item.installLocation)) return null;
    return { source: item.source, identity: item.identity, version: item.version, installLocation: item.installLocation };
  });
  const processes = data.processes.items.map((item): OwnedProcess | null => {
    if (!isRecord(item) || !isInteger(item.pid) || !isInteger(item.parentPid) || !isString(item.name) || !isString(item.executablePath) || !isString(item.matchedInstallLocation)) return null;
    return { pid: item.pid, parentPid: item.parentPid, name: item.name, executablePath: item.executablePath, matchedInstallLocation: item.matchedInstallLocation };
  });

  if (candidates.some((item) => item === null) || processes.some((item) => item === null)) {
    return { ok: false, error: { code: 'INVALID_SNAPSHOT_PAYLOAD', message: 'Diagnostic response failed validation.' } };
  }

  return { ok: true, data: {
    source: 'windows-readonly',
    collectedAt: data.collectedAt,
    installation: { state: data.installation.state as DiagnosticSnapshot & never, candidates: candidates as Installation[], detail: data.installation.detail },
    processes: { state: data.processes.state as DiagnosticSnapshot & never, items: processes as OwnedProcess[], detail: data.processes.detail },
    activeJobState: 'unknown',
    observations
  } as DiagnosticSnapshot };
};

contextBridge.exposeInMainWorld('doctor', {
  getEnvironment: async () => parseEnvironmentResult(await ipcRenderer.invoke('doctor:get-environment')),
  getMockSnapshot: async () => parseSnapshotResult(await ipcRenderer.invoke('doctor:get-mock-snapshot')),
  getDiagnosticSnapshot: async () => parseSnapshotResult(await ipcRenderer.invoke('doctor:get-diagnostic-snapshot'))
});
