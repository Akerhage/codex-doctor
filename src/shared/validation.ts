import type { DiagnosticObservation, DiagnosticSnapshot, DiagnosticStatus, EnvironmentInfo, Result } from './contracts.js';

const statuses: readonly DiagnosticStatus[] = ['healthy', 'warning', 'failed', 'unknown', 'unavailable', 'mock'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';

const isDiagnosticStatus = (value: unknown): value is DiagnosticStatus =>
  isString(value) && statuses.includes(value as DiagnosticStatus);

const parseObservation = (value: unknown): DiagnosticObservation | null => {
  if (!isRecord(value)) return null;
  if (!isString(value.id) || !isString(value.label) || !isDiagnosticStatus(value.status) || !isString(value.detail)) return null;
  return { id: value.id, label: value.label, status: value.status, detail: value.detail };
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

export const parseSnapshotResult = (value: unknown): Result<DiagnosticSnapshot> => {
  if (!isRecord(value) || value.ok !== true || !isRecord(value.data)) {
    return { ok: false, error: { code: 'INVALID_SNAPSHOT_PAYLOAD', message: 'Diagnostic response failed validation.' } };
  }

  const data = value.data;
  if (data.source !== 'mock' || !isString(data.collectedAt) || Number.isNaN(Date.parse(data.collectedAt)) || !Array.isArray(data.observations)) {
    return { ok: false, error: { code: 'INVALID_SNAPSHOT_PAYLOAD', message: 'Diagnostic response failed validation.' } };
  }

  const observations = data.observations.map(parseObservation);
  if (observations.some((item) => item === null)) {
    return { ok: false, error: { code: 'INVALID_SNAPSHOT_PAYLOAD', message: 'Diagnostic response failed validation.' } };
  }

  return {
    ok: true,
    data: {
      source: 'mock',
      collectedAt: data.collectedAt,
      observations: observations as DiagnosticObservation[]
    }
  };
};
