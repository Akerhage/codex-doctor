import type {
  DiagnosticObservation,
  DiagnosticSnapshot,
  DiagnosticStatus,
  EnvironmentInfo,
  InstallationEvidence,
  MockDiagnosticSnapshot,
  OwnedProcessEvidence,
  Result,
  WindowsDiagnosticSnapshot
} from './contracts.js';

const statuses: readonly DiagnosticStatus[] = ['healthy', 'warning', 'failed', 'unknown', 'unavailable', 'mock'];
const installationStates = ['detected', 'not-detected', 'unavailable', 'error'] as const;
const processStates = ['detected', 'none', 'unavailable', 'error'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';
const isNullableString = (value: unknown): value is string | null => value === null || isString(value);
const isInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;

const isDiagnosticStatus = (value: unknown): value is DiagnosticStatus =>
  isString(value) && statuses.includes(value as DiagnosticStatus);

const parseObservation = (value: unknown): DiagnosticObservation | null => {
  if (!isRecord(value)) return null;
  if (!isString(value.id) || !isString(value.label) || !isDiagnosticStatus(value.status) || !isString(value.detail)) return null;
  return { id: value.id, label: value.label, status: value.status, detail: value.detail };
};

const parseObservations = (value: unknown): DiagnosticObservation[] | null => {
  if (!Array.isArray(value)) return null;
  const observations = value.map(parseObservation);
  return observations.some((item) => item === null) ? null : observations as DiagnosticObservation[];
};

const parseInstallationEvidence = (value: unknown): InstallationEvidence | null => {
  if (!isRecord(value)) return null;
  if (value.source !== 'appx' && value.source !== 'uninstall-registry') return null;
  if (!isString(value.identity) || !isNullableString(value.version) || !isString(value.installLocation)) return null;
  return {
    source: value.source,
    identity: value.identity,
    version: value.version,
    installLocation: value.installLocation
  };
};

const parseOwnedProcess = (value: unknown): OwnedProcessEvidence | null => {
  if (!isRecord(value)) return null;
  if (!isInteger(value.pid) || !isInteger(value.parentPid)) return null;
  if (!isString(value.name) || !isString(value.executablePath) || !isString(value.matchedInstallLocation)) return null;
  return {
    pid: value.pid,
    parentPid: value.parentPid,
    name: value.name,
    executablePath: value.executablePath,
    matchedInstallLocation: value.matchedInstallLocation
  };
};

export const parseEnvironmentResult = (value: unknown): Result<EnvironmentInfo> => {
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

const parseMockSnapshot = (data: Record<string, unknown>): MockDiagnosticSnapshot | null => {
  if (data.source !== 'mock' || !isString(data.collectedAt) || Number.isNaN(Date.parse(data.collectedAt))) return null;
  const observations = parseObservations(data.observations);
  if (!observations) return null;
  return { source: 'mock', collectedAt: data.collectedAt, observations };
};

const parseWindowsSnapshot = (data: Record<string, unknown>): WindowsDiagnosticSnapshot | null => {
  if (data.source !== 'windows-readonly' || !isString(data.collectedAt) || Number.isNaN(Date.parse(data.collectedAt))) return null;
  if (!isRecord(data.installation) || !isRecord(data.processes) || data.activeJobState !== 'unknown') return null;
  if (!installationStates.includes(data.installation.state as typeof installationStates[number])) return null;
  if (!processStates.includes(data.processes.state as typeof processStates[number])) return null;
  if (!isString(data.installation.detail) || !isString(data.processes.detail)) return null;
  if (!Array.isArray(data.installation.candidates) || !Array.isArray(data.processes.items)) return null;

  const candidates = data.installation.candidates.map(parseInstallationEvidence);
  const processes = data.processes.items.map(parseOwnedProcess);
  const observations = parseObservations(data.observations);
  if (candidates.some((item) => item === null) || processes.some((item) => item === null) || !observations) return null;

  return {
    source: 'windows-readonly',
    collectedAt: data.collectedAt,
    installation: {
      state: data.installation.state as WindowsDiagnosticSnapshot['installation']['state'],
      candidates: candidates as InstallationEvidence[],
      detail: data.installation.detail
    },
    processes: {
      state: data.processes.state as WindowsDiagnosticSnapshot['processes']['state'],
      items: processes as OwnedProcessEvidence[],
      detail: data.processes.detail
    },
    activeJobState: 'unknown',
    observations
  };
};

export const parseSnapshotResult = (value: unknown): Result<DiagnosticSnapshot> => {
  if (!isRecord(value) || value.ok !== true || !isRecord(value.data)) {
    return { ok: false, error: { code: 'INVALID_SNAPSHOT_PAYLOAD', message: 'Diagnostic response failed validation.' } };
  }

  const snapshot = value.data.source === 'mock'
    ? parseMockSnapshot(value.data)
    : parseWindowsSnapshot(value.data);

  if (!snapshot) {
    return { ok: false, error: { code: 'INVALID_SNAPSHOT_PAYLOAD', message: 'Diagnostic response failed validation.' } };
  }

  return { ok: true, data: snapshot };
};
