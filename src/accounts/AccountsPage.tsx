import { useEffect, useState } from 'react';
import type { Result } from '../shared/contracts';
import type { AccountInput, AccountsState, ManualSnapshotInput } from '../shared/accounts-contracts';
import { latestSnapshot } from '../shared/accounts-capacity';
import { AccountCard } from './AccountCard';
import { AccountForm } from './AccountForm';
import { SnapshotForm } from './SnapshotForm';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; state: AccountsState }
  | { status: 'error'; message: string };

type Editor =
  | { kind: 'none' }
  | { kind: 'add-account' }
  | { kind: 'edit-account'; accountId: string }
  | { kind: 'report'; accountId: string };

const unreachable = 'Unable to reach the Codex Doctor preload API.';

export function AccountsPage() {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [editor, setEditor] = useState<Editor>({ kind: 'none' });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    window.doctor.accounts.getState()
      .then((result) => {
        if (cancelled) return;
        setLoad(result.ok ? { status: 'ready', state: result.data } : { status: 'error', message: result.error.message });
      })
      .catch(() => { if (!cancelled) setLoad({ status: 'error', message: unreachable }); });
    return () => { cancelled = true; };
  }, []);

  // Re-evaluate ages and passed reset times once a minute.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const run = async (action: () => Promise<Result<AccountsState>>, closeEditor = true) => {
    setBusy(true);
    setActionError(null);
    try {
      const result = await action();
      if (!result.ok) {
        setActionError(result.error.message);
        return;
      }
      setLoad({ status: 'ready', state: result.data });
      setNow(new Date());
      if (closeEditor) setEditor({ kind: 'none' });
    } catch {
      setActionError(unreachable);
    } finally {
      setBusy(false);
    }
  };

  if (load.status === 'loading') return <div className="state-panel">Loading the account registry…</div>;
  if (load.status === 'error') return <div className="state-panel state-panel--error" role="alert">{load.message}</div>;

  const { state } = load;
  const findAccount = (id: string) => state.accounts.find((account) => account.id === id) ?? null;

  return (
    <section className="section-block">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Manually reported</div>
          <h2>Codex accounts</h2>
        </div>
        <button className="diagnostic-refresh" type="button" disabled={busy || editor.kind !== 'none'} onClick={() => setEditor({ kind: 'add-account' })}>
          Add account
        </button>
      </div>

      <div className="notice notice--neutral">
        Every value on this page is entered by you and stored only by Codex Doctor. Doctor does not read Codex sign-in data,
        does not check which account Codex is using and does not contact any service. Missing values stay unknown.
      </div>

      {actionError && <div className="notice notice--warning" role="alert">{actionError}</div>}

      {editor.kind === 'add-account' && (
        <AccountForm
          account={null}
          busy={busy}
          onSubmit={(input: AccountInput) => { void run(() => window.doctor.accounts.upsertAccount(input)); }}
          onCancel={() => setEditor({ kind: 'none' })}
        />
      )}

      {state.accounts.length === 0 ? (
        <div className="state-panel state-panel--compact">No accounts registered yet.</div>
      ) : (
        <div className="account-grid">
          {state.accounts.map((account) => (
            <div key={account.id} className="account-grid__item">
              <AccountCard
                account={account}
                snapshot={latestSnapshot(state, account.id)}
                reportedActive={state.reportedActiveAccountId === account.id}
                now={now}
                busy={busy || editor.kind !== 'none'}
                onEdit={() => setEditor({ kind: 'edit-account', accountId: account.id })}
                onReport={() => setEditor({ kind: 'report', accountId: account.id })}
                onSetActive={() => { void run(() => window.doctor.accounts.setReportedActive(account.id)); }}
                onRemove={() => { void run(() => window.doctor.accounts.removeAccount(account.id)); }}
              />
              {editor.kind === 'edit-account' && editor.accountId === account.id && (
                <AccountForm
                  account={findAccount(account.id)}
                  busy={busy}
                  onSubmit={(input) => { void run(() => window.doctor.accounts.upsertAccount(input)); }}
                  onCancel={() => setEditor({ kind: 'none' })}
                />
              )}
              {editor.kind === 'report' && editor.accountId === account.id && (
                <SnapshotForm
                  accountId={account.id}
                  accountLabel={account.label}
                  busy={busy}
                  onSubmit={(input: ManualSnapshotInput) => { void run(() => window.doctor.accounts.recordManualSnapshot(input)); }}
                  onCancel={() => setEditor({ kind: 'none' })}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
