import { useEffect, useMemo, useState } from 'react';
import type { DiagnosticObservation, DiagnosticSnapshot, EnvironmentInfo, WindowsDiagnosticSnapshot } from './shared/contracts';

type Page = 'dashboard' | 'diagnostics' | 'recovery' | 'settings';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; environment: EnvironmentInfo; snapshot: DiagnosticSnapshot }
  | { status: 'error'; message: string };

const pageLabels: Record<Page, string> = {
  dashboard: 'Dashboard',
  diagnostics: 'Diagnostics',
  recovery: 'Recovery',
  settings: 'Settings'
};

const statusLabel: Record<DiagnosticObservation['status'], string> = {
  healthy: 'Detected',
  warning: 'Warning',
  failed: 'Failed',
  unknown: 'Unknown',
  unavailable: 'Unavailable',
  mock: 'Mock'
};

function ObservationCard({ observation }: { observation: DiagnosticObservation }) {
  return (
    <article className="observation-card">
      <div className="observation-card__header">
        <h3>{observation.label}</h3>
        <span className={`status-badge status-badge--${observation.status}`}>
          {statusLabel[observation.status]}
        </span>
      </div>
      <p>{observation.detail}</p>
    </article>
  );
}

function Dashboard({ environment, snapshot }: { environment: EnvironmentInfo; snapshot: DiagnosticSnapshot }) {
  const live = snapshot.source === 'windows-readonly';

  return (
    <>
      <section className="hero-panel">
        <div>
          <div className="eyebrow">Nightingale · M2</div>
          <h2>Diagnostic workspace</h2>
          <p>
            {live
              ? 'Codex Doctor is collecting bounded Windows installation and process evidence in read-only mode. Active task state remains unknown.'
              : 'This diagnostic snapshot is mock data. No live Codex evidence is represented by this view.'}
          </p>
        </div>
        <div className="hero-panel__meta">
          <span>Doctor {environment.doctorVersion}</span>
          <span>{environment.platform} · {environment.architecture}</span>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Current evidence</div>
            <h2>Observed states</h2>
          </div>
          <span className="source-pill">SOURCE: {snapshot.source.toUpperCase()}</span>
        </div>
        <div className="observation-grid">
          {snapshot.observations.map((observation) => (
            <ObservationCard key={observation.id} observation={observation} />
          ))}
        </div>
      </section>

      <section className="section-block evidence-panel">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Evidence timeline</div>
            <h2>Latest collection</h2>
          </div>
        </div>
        <div className="timeline-row">
          <span className="timeline-dot" aria-hidden="true" />
          <div>
            <strong>{live ? 'Read-only Windows snapshot collected' : 'Mock diagnostic snapshot collected'}</strong>
            <p>{new Date(snapshot.collectedAt).toLocaleString()}</p>
          </div>
        </div>
      </section>
    </>
  );
}

function LiveEvidence({ snapshot }: { snapshot: WindowsDiagnosticSnapshot }) {
  return (
    <>
      <div className="notice notice--neutral">
        Ownership is accepted only when a process executable path is contained by a Codex installation root discovered from Windows metadata. Process name alone is ignored. Command lines and conversation data are not collected.
      </div>

      <section className="section-block section-block--nested">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Installation evidence</div>
            <h2>{snapshot.installation.state}</h2>
          </div>
        </div>
        <p>{snapshot.installation.detail}</p>
        {snapshot.installation.candidates.length === 0 ? (
          <div className="state-panel state-panel--compact">No installation candidate accepted.</div>
        ) : (
          <div className="detail-grid">
            {snapshot.installation.candidates.map((candidate) => (
              <div className="detail-card detail-card--wide" key={`${candidate.source}:${candidate.installLocation}`}>
                <span>{candidate.source}</span>
                <strong>{candidate.identity}</strong>
                <small>{candidate.version ?? 'Version unavailable'}</small>
                <code>{candidate.installLocation}</code>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section-block section-block--nested">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Owned process evidence</div>
            <h2>{snapshot.processes.state}</h2>
          </div>
        </div>
        <p>{snapshot.processes.detail}</p>
        {snapshot.processes.items.length === 0 ? (
          <div className="state-panel state-panel--compact">No process has been proven Codex-owned.</div>
        ) : (
          <div className="detail-grid">
            {snapshot.processes.items.map((process) => (
              <div className="detail-card detail-card--wide" key={process.pid}>
                <span>PID {process.pid} · parent {process.parentPid}</span>
                <strong>{process.name}</strong>
                <code>{process.executablePath}</code>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function Diagnostics({ environment, snapshot }: { environment: EnvironmentInfo; snapshot: DiagnosticSnapshot }) {
  return (
    <section className="section-block">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Read-only diagnostics</div>
          <h2>Diagnostics</h2>
        </div>
      </div>
      <div className="detail-grid">
        <div className="detail-card">
          <span>Electron</span><strong>{environment.runtime.electron}</strong>
        </div>
        <div className="detail-card">
          <span>Chromium</span><strong>{environment.runtime.chrome}</strong>
        </div>
        <div className="detail-card">
          <span>Node</span><strong>{environment.runtime.node}</strong>
        </div>
      </div>

      {snapshot.source === 'windows-readonly' ? (
        <LiveEvidence snapshot={snapshot} />
      ) : (
        <div className="notice notice--warning">Live Windows diagnostics are unavailable; this snapshot is mock data.</div>
      )}
    </section>
  );
}

function Recovery() {
  return (
    <section className="section-block">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Safety gate</div>
          <h2>Recovery</h2>
        </div>
      </div>
      <div className="notice notice--warning">
        Recovery actions are intentionally disabled. M2 observes bounded metadata only and will not restart processes, clear caches, alter sessions or modify Codex state.
      </div>
      <div className="recovery-placeholder">
        <div className="recovery-placeholder__icon">+</div>
        <h3>No executable repairs</h3>
        <p>Recovery remains a separate future milestone requiring version-aware target validation, active-job safety checks, backup where applicable, explicit confirmation and verification.</p>
      </div>
    </section>
  );
}

function Settings() {
  return (
    <section className="section-block">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Local preferences</div>
          <h2>Settings</h2>
        </div>
      </div>
      <div className="settings-card">
        <div>
          <strong>Diagnostic mode</strong>
          <p>Read-only Windows metadata</p>
        </div>
        <span className="status-badge status-badge--healthy">Locked</span>
      </div>
      <div className="settings-card">
        <div>
          <strong>Automatic recovery</strong>
          <p>Disabled by project policy</p>
        </div>
        <span className="status-badge status-badge--unavailable">Off</span>
      </div>
    </section>
  );
}

export function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [environmentResult, snapshotResult] = await Promise.all([
          window.doctor.getEnvironment(),
          window.doctor.getDiagnosticSnapshot()
        ]);

        if (cancelled) return;
        if (!environmentResult.ok) {
          setLoadState({ status: 'error', message: environmentResult.error.message });
          return;
        }
        if (!snapshotResult.ok) {
          setLoadState({ status: 'error', message: snapshotResult.error.message });
          return;
        }

        setLoadState({ status: 'ready', environment: environmentResult.data, snapshot: snapshotResult.data });
      } catch {
        if (!cancelled) setLoadState({ status: 'error', message: 'Unable to reach the Codex Doctor preload API.' });
      }
    };

    void load();
    return () => { cancelled = true; };
  }, []);

  const content = useMemo(() => {
    if (loadState.status === 'loading') {
      return <div className="state-panel">Collecting bounded read-only diagnostics…</div>;
    }
    if (loadState.status === 'error') {
      return <div className="state-panel state-panel--error">{loadState.message}</div>;
    }

    if (page === 'dashboard') return <Dashboard environment={loadState.environment} snapshot={loadState.snapshot} />;
    if (page === 'diagnostics') return <Diagnostics environment={loadState.environment} snapshot={loadState.snapshot} />;
    if (page === 'recovery') return <Recovery />;
    return <Settings />;
  }, [loadState, page]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><span /></div>
          <div>
            <strong>CODEX DOCTOR</strong>
            <small>NIGHTINGALE</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary">
          {(Object.keys(pageLabels) as Page[]).map((item) => (
            <button
              key={item}
              className={page === item ? 'nav-item nav-item--active' : 'nav-item'}
              type="button"
              onClick={() => setPage(item)}
            >
              <span className="nav-item__dot" aria-hidden="true" />
              {pageLabels[item]}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot" aria-hidden="true" />
          Read-only diagnostics
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <div className="eyebrow">Codex Doctor</div>
            <h1>{pageLabels[page]}</h1>
          </div>
          <span className="mode-pill">SAFE MODE · READ ONLY</span>
        </header>
        <div className="content-area">{content}</div>
      </main>
    </div>
  );
}
