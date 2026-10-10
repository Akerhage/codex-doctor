import { useState, type FormEvent } from 'react';
import type { AccountInput, AccountRecord } from '../shared/accounts-contracts';

export function AccountForm({
  account,
  busy,
  onSubmit,
  onCancel
}: {
  account: AccountRecord | null;
  busy: boolean;
  onSubmit: (input: AccountInput) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(account?.label ?? '');
  const [email, setEmail] = useState(account?.email ?? '');
  const [note, setNote] = useState(account?.note ?? '');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({ id: account?.id ?? null, label, email, note: note.trim().length > 0 ? note : null });
  };

  const prefix = account ? `edit-${account.id}` : 'new-account';

  return (
    <form className="account-form" onSubmit={submit} aria-label={account ? `Edit ${account.label}` : 'Add account'}>
      <div className="account-form__grid">
        <label htmlFor={`${prefix}-label`}>
          Name
          <input id={`${prefix}-label`} value={label} maxLength={60} required onChange={(event) => setLabel(event.target.value)} />
        </label>
        <label htmlFor={`${prefix}-email`}>
          Email
          <input id={`${prefix}-email`} type="email" value={email} maxLength={254} required onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label htmlFor={`${prefix}-note`} className="account-form__wide">
          Note (optional)
          <input id={`${prefix}-note`} value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} />
        </label>
      </div>
      <div className="account-form__actions">
        <button className="diagnostic-refresh" type="submit" disabled={busy}>{account ? 'Save account' : 'Add account'}</button>
        <button className="account-button--quiet" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}
