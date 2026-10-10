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
type InstallationState = 'detected' | 'not-detected' | 'unavailable' | 'error';
type ProcessState = 'detected' | 'none' | 'unavailable' | 'error';

type DiagnosticSnapshot =
  | { source: 'mock'; collectedAt: string; observations: Observation[] }
  | {
      source: 'windows-readonly';
      collectedAt: string;
      installation: { state: InstallationState; candidates: Installation[]; detail: string };
      processes: { state: ProcessState; items: OwnedProcess[]; detail: string };
      activeJobState: 'unknown';
      observations: Observation[];
    };

const statuses: readonly DiagnosticStatus[] = ['healthy', 'warning', 'failed', 'unknown', 'unavailable', 'mock'];
const installationStates: readonly InstallationState[] = ['detected', 'not-detected', 'unavailable', 'error'];
const processStates: readonly ProcessState[] = ['detected', 'none', 'unavailable', 'error'];

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
  if (!isRecord(value) || value.ok !== true || !isRecord(value.data)) {
    return { ok: false, error: { code: 'INVALID_SNAPSHOT_PAYLOAD', message: 'Diagnostic response failed validation.' } };
  }

  const data = value.data;
  const collectedAt = data.collectedAt;
  if (!isString(collectedAt) || Number.isNaN(Date.parse(collectedAt))) {
    return { ok: false, error: { code: 'INVALID_SNAPSHOT_PAYLOAD', message: 'Diagnostic response failed validation.' } };
  }

  const observations = parseObservations(data.observations);
  if (!observations) return { ok: false, error: { code: 'INVALID_SNAPSHOT_PAYLOAD', message: 'Diagnostic response failed validation.' } };

  if (data.source === 'mock') {
    return { ok: true, data: { source: 'mock', collectedAt, observations } };
  }

  if (data.source !== 'windows-readonly' || !isRecord(data.installation) || !isRecord(data.processes) || data.activeJobState !== 'unknown') {
    return { ok: false, error: { code: 'INVALID_SNAPSHOT_PAYLOAD', message: 'Diagnostic response failed validation.' } };
  }

  const installationState = data.installation.state;
  const processState = data.processes.state;
  const installationDetail = data.installation.detail;
  const processDetail = data.processes.detail;

  if (!isString(installationState) || !installationStates.includes(installationState as InstallationState) || !isString(processState) || !processStates.includes(processState as ProcessState)) {
    return { ok: false, error: { code: 'INVALID_SNAPSHOT_PAYLOAD', message: 'Diagnostic response failed validation.' } };
  }
  if (!isString(installationDetail) || !isString(processDetail) || !Array.isArray(data.installation.candidates) || !Array.isArray(data.processes.items)) {
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
    collectedAt,
    installation: { state: installationState as InstallationState, candidates: candidates as Installation[], detail: installationDetail },
    processes: { state: processState as ProcessState, items: processes as OwnedProcess[], detail: processDetail },
    activeJobState: 'unknown',
    observations
  } };
};

// Account registry (K1). Mirrors src/shared/accounts-validation.ts because a sandboxed
// preload cannot import project modules. Keep both in sync; tests cover the shared copy.
type AccountRecord = { id: string; label: string; email: string; note: string | null; createdAt: string };
type CapacitySnapshot = {
  accountId: string; source: 'manual'; observedAt: string; recordedAt: string;
  weeklyRemainingPercent: number | null; weeklyResetsAt: string | null;
  fiveHourRemainingPercent: number | null; fiveHourResetsAt: string | null;
  resetCreditsRemaining: number | null; subscriptionEndsOn: string | null;
  subscriptionRenewal: 'renewed' | 'pending' | 'unknown';
};
type AccountsState = { schemaVersion: 1; accounts: AccountRecord[]; reportedActiveAccountId: string | null; snapshots: CapacitySnapshot[] };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const isoInstantPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
const isUuid = (value: unknown): value is string => isString(value) && uuidPattern.test(value);
const isIsoInstant = (value: unknown): value is string => isString(value) && isoInstantPattern.test(value) && !Number.isNaN(Date.parse(value));
const isCalendarDate = (value: unknown): value is string => isString(value) && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const isPercent = (value: unknown): boolean => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100;
const isCount = (value: unknown): boolean => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 99;
const orNull = (value: unknown, guard: (candidate: unknown) => boolean): boolean => value === null || guard(value);

const isAccountRecord = (value: unknown): value is AccountRecord =>
  isRecord(value) && Object.keys(value).length === 5 && isUuid(value.id) && isString(value.label) && isString(value.email)
  && isNullableString(value.note) && isIsoInstant(value.createdAt);

const isCapacitySnapshot = (value: unknown): value is CapacitySnapshot =>
  isRecord(value) && Object.keys(value).length === 11 && isUuid(value.accountId) && value.source === 'manual'
  && isIsoInstant(value.observedAt) && isIsoInstant(value.recordedAt)
  && orNull(value.weeklyRemainingPercent, isPercent) && orNull(value.weeklyResetsAt, isIsoInstant)
  && orNull(value.fiveHourRemainingPercent, isPercent) && orNull(value.fiveHourResetsAt, isIsoInstant)
  && orNull(value.resetCreditsRemaining, isCount) && orNull(value.subscriptionEndsOn, isCalendarDate)
  && (value.subscriptionRenewal === 'renewed' || value.subscriptionRenewal === 'pending' || value.subscriptionRenewal === 'unknown');

const parseAccountsResult = (value: unknown): Result<AccountsState> => {
  const invalid: Result<AccountsState> = { ok: false, error: { code: 'INVALID_ACCOUNTS_PAYLOAD', message: 'Account registry response failed validation.' } };
  if (!isRecord(value)) return invalid;
  if (value.ok === false) {
    if (!isRecord(value.error) || !isString(value.error.code) || !isString(value.error.message)) return invalid;
    return { ok: false, error: { code: value.error.code, message: value.error.message } };
  }
  const data = value.data;
  if (value.ok !== true || !isRecord(data) || data.schemaVersion !== 1 || !Array.isArray(data.accounts) || !Array.isArray(data.snapshots)) return invalid;
  if (!data.accounts.every(isAccountRecord) || !data.snapshots.every(isCapacitySnapshot)) return invalid;
  const ids = new Set(data.accounts.map((account) => account.id));
  if (!orNull(data.reportedActiveAccountId, (id) => isUuid(id) && ids.has(id))) return invalid;
  if (!data.snapshots.every((snapshot) => ids.has(snapshot.accountId))) return invalid;
  return { ok: true, data: {
    schemaVersion: 1,
    accounts: data.accounts.map((account) => ({ ...account })),
    reportedActiveAccountId: data.reportedActiveAccountId as string | null,
    snapshots: data.snapshots.map((snapshot) => ({ ...snapshot }))
  } };
};

const invokeAccounts = async (channel: string, ...args: unknown[]): Promise<Result<AccountsState>> =>
  parseAccountsResult(await ipcRenderer.invoke(channel, ...args));

contextBridge.exposeInMainWorld('doctor', {
  getEnvironment: async () => parseEnvironmentResult(await ipcRenderer.invoke('doctor:get-environment')),
  getMockSnapshot: async () => parseSnapshotResult(await ipcRenderer.invoke('doctor:get-mock-snapshot')),
  getDiagnosticSnapshot: async () => parseSnapshotResult(await ipcRenderer.invoke('doctor:get-diagnostic-snapshot')),
  accounts: {
    getState: () => invokeAccounts('doctor:accounts:get-state'),
    upsertAccount: (input: unknown) => invokeAccounts('doctor:accounts:upsert-account', input),
    removeAccount: (accountId: unknown) => invokeAccounts('doctor:accounts:remove-account', accountId),
    recordManualSnapshot: (input: unknown) => invokeAccounts('doctor:accounts:record-manual-snapshot', input),
    setReportedActive: (accountId: unknown) => invokeAccounts('doctor:accounts:set-reported-active', accountId)
  }
});
