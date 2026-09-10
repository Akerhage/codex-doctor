import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import type {
  InstallationEvidence,
  OwnedProcessEvidence,
  WindowsDiagnosticSnapshot
} from '../../src/shared/contracts.js';
import { classifyCollectorFailure, collectorFailureDetail } from './collector-failure.js';

const execFileAsync = promisify(execFile);

const POWERSHELL_TIMEOUT_MS = 7_500;
const POWERSHELL_MAX_BUFFER = 256 * 1024;

const discoveryScript = String.raw`
$ErrorActionPreference = 'Stop'

function Normalize-Root([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
  try { return ([IO.Path]::GetFullPath($Value).TrimEnd('\') + '\') } catch { return $null }
}

function Test-PathUnderRoot([string]$Candidate, [string]$Root) {
  if ([string]::IsNullOrWhiteSpace($Candidate) -or [string]::IsNullOrWhiteSpace($Root)) { return $false }
  try {
    $candidateFull = [IO.Path]::GetFullPath($Candidate)
    $rootFull = Normalize-Root $Root
    if ($null -eq $rootFull) { return $false }
    return $candidateFull.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)
  } catch { return $false }
}

$installations = @()
$appxError = $null
$registryError = $null
$processError = $null

try {
  $installations += @(Get-AppxPackage -ErrorAction Stop |
    Where-Object { $_.Name -match '(?i)codex' -or $_.PackageFullName -match '(?i)codex' } |
    ForEach-Object {
      if (-not [string]::IsNullOrWhiteSpace($_.InstallLocation)) {
        [pscustomobject]@{
          source = 'appx'
          identity = [string]$_.Name
          version = [string]$_.Version
          installLocation = [string]$_.InstallLocation
        }
      }
    })
} catch {
  $appxError = 'AppX metadata query was unavailable.'
}

try {
  $registryPaths = @(
    'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
  )

  foreach ($registryPath in $registryPaths) {
    $installations += @(Get-ItemProperty -Path $registryPath -ErrorAction SilentlyContinue |
      Where-Object { $_.DisplayName -match '(?i)codex' } |
      ForEach-Object {
        if (-not [string]::IsNullOrWhiteSpace($_.InstallLocation)) {
          [pscustomobject]@{
            source = 'uninstall-registry'
            identity = [string]$_.DisplayName
            version = if ($null -eq $_.DisplayVersion) { $null } else { [string]$_.DisplayVersion }
            installLocation = [string]$_.InstallLocation
          }
        }
      })
  }
} catch {
  $registryError = 'Uninstall registry metadata query was unavailable.'
}

$deduped = @($installations |
  Where-Object { -not [string]::IsNullOrWhiteSpace($_.installLocation) } |
  Sort-Object source, identity, installLocation -Unique)

$processes = @()
if ($deduped.Count -gt 0) {
  try {
    $allProcesses = @(Get-CimInstance Win32_Process -ErrorAction Stop)
    foreach ($process in $allProcesses) {
      if ([string]::IsNullOrWhiteSpace($process.ExecutablePath)) { continue }
      foreach ($installation in $deduped) {
        if (Test-PathUnderRoot ([string]$process.ExecutablePath) ([string]$installation.installLocation)) {
          $processes += [pscustomobject]@{
            pid = [int]$process.ProcessId
            parentPid = [int]$process.ParentProcessId
            name = [string]$process.Name
            executablePath = [string]$process.ExecutablePath
            matchedInstallLocation = [string]$installation.installLocation
          }
          break
        }
      }
    }
  } catch {
    $processError = 'Process metadata query was unavailable.'
  }
}

[pscustomobject]@{
  installations = @($deduped)
  processes = @($processes)
  appxError = $appxError
  registryError = $registryError
  processError = $processError
} | ConvertTo-Json -Depth 5 -Compress
`;

type RawDiscovery = {
  installations?: unknown;
  processes?: unknown;
  appxError?: unknown;
  registryError?: unknown;
  processError?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

const asNullableString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

export const isPathWithinRoot = (candidate: string, root: string): boolean => {
  if (!path.win32.isAbsolute(candidate) || !path.win32.isAbsolute(root)) return false;
  const normalizedCandidate = path.win32.normalize(candidate).toLowerCase();
  const normalizedRoot = `${path.win32.normalize(root).replace(/[\\/]+$/, '')}\\`.toLowerCase();
  return normalizedCandidate.startsWith(normalizedRoot);
};

const parseInstallations = (value: unknown): InstallationEvidence[] => {
  const installations: InstallationEvidence[] = [];

  for (const item of asArray(value)) {
    if (!isRecord(item)) continue;
    if (item.source !== 'appx' && item.source !== 'uninstall-registry') continue;
    if (typeof item.identity !== 'string' || !/codex/i.test(item.identity)) continue;
    if (typeof item.installLocation !== 'string' || !path.win32.isAbsolute(item.installLocation)) continue;

    installations.push({
      source: item.source,
      identity: item.identity,
      version: asNullableString(item.version),
      installLocation: path.win32.normalize(item.installLocation)
    });
  }

  return installations;
};

const parseProcesses = (value: unknown, installations: InstallationEvidence[]): OwnedProcessEvidence[] => {
  const processes: OwnedProcessEvidence[] = [];

  for (const item of asArray(value)) {
    if (!isRecord(item)) continue;
    if (!Number.isInteger(item.pid) || !Number.isInteger(item.parentPid)) continue;
    if (typeof item.name !== 'string' || typeof item.executablePath !== 'string' || typeof item.matchedInstallLocation !== 'string') continue;

    const installation = installations.find((candidate) =>
      path.win32.normalize(candidate.installLocation).toLowerCase() === path.win32.normalize(item.matchedInstallLocation as string).toLowerCase()
    );
    if (!installation || !isPathWithinRoot(item.executablePath, installation.installLocation)) continue;

    processes.push({
      pid: item.pid as number,
      parentPid: item.parentPid as number,
      name: path.win32.basename(item.name),
      executablePath: path.win32.normalize(item.executablePath),
      matchedInstallLocation: installation.installLocation
    });
  }

  return processes;
};

export const collectWindowsDiagnostics = async (): Promise<WindowsDiagnosticSnapshot> => {
  const collectedAt = new Date().toISOString();

  if (process.platform !== 'win32') {
    return {
      source: 'windows-readonly',
      collectedAt,
      installation: {
        state: 'unavailable',
        candidates: [],
        detail: 'Live Codex installation discovery is available only on Windows.'
      },
      processes: {
        state: 'unavailable',
        items: [],
        detail: 'Live Codex process discovery is available only on Windows.'
      },
      activeJobState: 'unknown',
      observations: [
        { id: 'installation', label: 'Codex installation', status: 'unavailable', detail: 'Windows installation metadata is unavailable on this platform.' },
        { id: 'processes', label: 'Owned Codex processes', status: 'unavailable', detail: 'Windows process metadata is unavailable on this platform.' },
        { id: 'active-job', label: 'Active job state', status: 'unknown', detail: 'Process presence alone cannot establish whether a Codex task is active.' },
        { id: 'recovery', label: 'Recovery engine', status: 'unavailable', detail: 'Recovery remains intentionally disabled in M2.' }
      ]
    };
  }

  try {
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      discoveryScript
    ], {
      windowsHide: true,
      timeout: POWERSHELL_TIMEOUT_MS,
      maxBuffer: POWERSHELL_MAX_BUFFER,
      encoding: 'utf8'
    });

    const raw = JSON.parse(stdout.trim()) as RawDiscovery;
    const installations = parseInstallations(raw.installations);
    const processes = parseProcesses(raw.processes, installations);
    const metadataUnavailable = typeof raw.appxError === 'string' && typeof raw.registryError === 'string';
    const processUnavailable = typeof raw.processError === 'string';

    const installationState = metadataUnavailable
      ? 'unavailable' as const
      : installations.length > 0 ? 'detected' as const : 'not-detected' as const;
    const processState = processUnavailable
      ? 'unavailable' as const
      : processes.length > 0 ? 'detected' as const : 'none' as const;

    return {
      source: 'windows-readonly',
      collectedAt,
      installation: {
        state: installationState,
        candidates: installations,
        detail: installationState === 'detected'
          ? `${installations.length} Codex installation candidate${installations.length === 1 ? '' : 's'} matched Windows package metadata.`
          : installationState === 'unavailable'
            ? 'Windows package metadata sources were unavailable.'
            : 'No Codex installation root was identified from the bounded metadata sources.'
      },
      processes: {
        state: processState,
        items: processes,
        detail: processState === 'detected'
          ? `${processes.length} running process${processes.length === 1 ? '' : 'es'} had an executable path under a discovered Codex installation root.`
          : processState === 'unavailable'
            ? 'Windows process metadata could not be queried.'
            : installations.length === 0
              ? 'No owned process can be established until a Codex installation root is identified.'
              : 'No running process path matched the discovered Codex installation root.'
      },
      activeJobState: 'unknown',
      observations: [
        {
          id: 'installation',
          label: 'Codex installation',
          status: installationState === 'detected' ? 'healthy' : installationState === 'unavailable' ? 'unavailable' : 'unknown',
          detail: installationState === 'detected'
            ? 'A Codex installation root was identified from Windows metadata. This is installation evidence, not a health verdict.'
            : installationState === 'unavailable'
              ? 'Doctor could not query the bounded Windows installation metadata sources.'
              : 'Doctor did not identify Codex from the bounded Windows installation metadata sources.'
        },
        {
          id: 'processes',
          label: 'Owned Codex processes',
          status: processState === 'detected' ? 'healthy' : processState === 'unavailable' ? 'unavailable' : 'unknown',
          detail: processState === 'detected'
            ? 'At least one process executable path is contained by a discovered Codex installation root.'
            : processState === 'unavailable'
              ? 'Doctor could not collect bounded Windows process metadata.'
              : 'No running process has been proven Codex-owned by installation-path evidence.'
        },
        {
          id: 'active-job',
          label: 'Active job state',
          status: 'unknown',
          detail: 'Doctor does not infer task activity from process presence, CPU usage or window state.'
        },
        {
          id: 'recovery',
          label: 'Recovery engine',
          status: 'unavailable',
          detail: 'Recovery actions remain intentionally disabled in M2.'
        }
      ]
    };
  } catch (error) {
    const failureKind = classifyCollectorFailure(error);
    const failureDetail = collectorFailureDetail(failureKind, POWERSHELL_TIMEOUT_MS);

    return {
      source: 'windows-readonly',
      collectedAt,
      installation: {
        state: 'error',
        candidates: [],
        detail: failureDetail
      },
      processes: {
        state: 'error',
        items: [],
        detail: 'No process evidence was accepted because the Windows discovery collector failed.'
      },
      activeJobState: 'unknown',
      observations: [
        { id: 'installation', label: 'Codex installation', status: 'failed', detail: failureDetail },
        { id: 'processes', label: 'Owned Codex processes', status: 'unknown', detail: 'Process ownership was not evaluated after collector failure.' },
        { id: 'active-job', label: 'Active job state', status: 'unknown', detail: 'Active task state remains unknown.' },
        { id: 'recovery', label: 'Recovery engine', status: 'unavailable', detail: 'Recovery actions remain intentionally disabled in M2.' }
      ]
    };
  }
};
