export type DiagnosticStatus = 'healthy' | 'warning' | 'failed' | 'unknown' | 'unavailable' | 'mock';

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export interface EnvironmentInfo {
  doctorVersion: string;
  platform: string;
  architecture: string;
  runtime: {
    electron: string;
    chrome: string;
    node: string;
  };
}

export interface DiagnosticObservation {
  id: string;
  label: string;
  status: DiagnosticStatus;
  detail: string;
}

export interface MockDiagnosticSnapshot {
  source: 'mock';
  collectedAt: string;
  observations: DiagnosticObservation[];
}

export type InstallationSource = 'appx' | 'uninstall-registry';
export type InstallationState = 'detected' | 'not-detected' | 'unavailable' | 'error';
export type ProcessEvidenceState = 'detected' | 'none' | 'unavailable' | 'error';

export interface InstallationEvidence {
  source: InstallationSource;
  identity: string;
  version: string | null;
  installLocation: string;
}

export interface OwnedProcessEvidence {
  pid: number;
  parentPid: number;
  name: string;
  executablePath: string;
  matchedInstallLocation: string;
}

export interface WindowsDiagnosticSnapshot {
  source: 'windows-readonly';
  collectedAt: string;
  installation: {
    state: InstallationState;
    candidates: InstallationEvidence[];
    detail: string;
  };
  processes: {
    state: ProcessEvidenceState;
    items: OwnedProcessEvidence[];
    detail: string;
  };
  activeJobState: 'unknown';
  observations: DiagnosticObservation[];
}

export type DiagnosticSnapshot = MockDiagnosticSnapshot | WindowsDiagnosticSnapshot;

export interface DoctorApi {
  getEnvironment(): Promise<Result<EnvironmentInfo>>;
  getMockSnapshot(): Promise<Result<MockDiagnosticSnapshot>>;
  getDiagnosticSnapshot(): Promise<Result<DiagnosticSnapshot>>;
}
