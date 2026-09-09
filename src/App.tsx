import { useEffect, useMemo, useState } from 'react';
import type { DiagnosticObservation, DiagnosticSnapshot, EnvironmentInfo } from './shared/contracts';

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
  healthy: 'Healthy',
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
  return (
    <>
      <section className="hero-panel">
        <div>
          <div className="eyebrow">Nightingale · Sprint 1</div>
          <h2>Diagnostic workspace</h2>
          <p>
            This build is intentionally read-only. All Codex observations below are mock data until the diagnostics adapter is implemented.
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
            <strong>Mock diagnostic snapshot collected</strong>
            <p>{new Date(snapshot.collectedAt).toLocaleString()}</p>
          </div>
        </div>
      </section>
    </>
  );
}

function Diagnostics({ environment, snapshot }: { environment: EnvironmentInfo; snapshot: DiagnosticSnapshot }) {
  return (
    <section className="section-block">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Read-only foundation</div>
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
      <div className="notice notice--neutral">
        Real Codex installation discovery, process ownership and Windows event collection are not implemented in this sprint.
      </div>
      <div className="observation-grid observation-grid--single">
        {snapshot.observations.map((observation) => (
          <ObservationCard key={observation.id} observation={observation} />
        ))}
      </div>
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
        Recovery actions are intentionally disabled. Codex Doctor will not restart processes, clear caches, alter sessions or modify internal state in Sprint 1.
      </div>
      <div className="recovery-placeholder">
        <div className="recovery-placeholder__icon">+</div>
        <h3>No executable repairs</h3>
        <p>Future operations require version-aware target validation, active-job safety checks, backup where applicable, explicit confirmation and verification.</p>
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
          <p>Read-only</p>
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
          window.doctor.getMockSnapshot()
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
      return <div className="state-panel">Loading Codex Doctor foundation…</div>;
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
          Read-only foundation
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
