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

export interface DiagnosticSnapshot {
  source: 'mock';
  collectedAt: string;
  observations: DiagnosticObservation[];
}

export interface DoctorApi {
  getEnvironment(): Promise<Result<EnvironmentInfo>>;
  getMockSnapshot(): Promise<Result<DiagnosticSnapshot>>;
}
