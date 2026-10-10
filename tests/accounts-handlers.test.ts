import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createAccountHandlers } from '../electron/ipc/account-handlers';
import { createRegistryStore } from '../electron/services/accounts/registry-store';
import { parseAccountsResult } from '../src/shared/accounts-validation';
import { snapshotInput } from './accounts-fixtures';

// Exercises main-process handler -> store -> renderer-side result validation, as the IPC path does.

let directory: string;
const clock = () => new Date('2026-10-10T09:00:00.000Z');

beforeEach(async () => { directory = await mkdtemp(path.join(tmpdir(), 'doctor-accounts-ipc-')); });
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });

const handlers = () => createAccountHandlers(createRegistryStore(directory), clock);

describe('account IPC handlers', () => {
  it('runs the full add, report, mark active and remove flow', async () => {
    const api = handlers();
    const added = parseAccountsResult(await api.upsertAccount({ id: null, label: 'Konto A', email: 'konto1@example.test', note: null }));
    if (!added.ok) throw new Error(added.error.message);
    const accountId = added.data.accounts[0].id;

    const reported = parseAccountsResult(await api.recordManualSnapshot(snapshotInput({ accountId, weeklyRemainingPercent: 45, resetCreditsRemaining: 2 })));
    expect(reported.ok && reported.data.snapshots[0]).toMatchObject({ accountId, source: 'manual', weeklyRemainingPercent: 45, resetCreditsRemaining: 2 });

    const active = parseAccountsResult(await api.setReportedActive(accountId));
    expect(active.ok && active.data.reportedActiveAccountId).toBe(accountId);

    const removed = parseAccountsResult(await api.removeAccount(accountId));
    expect(removed.ok && removed.data).toMatchObject({ accounts: [], snapshots: [], reportedActiveAccountId: null });
  });

  it.each([
    ['upsertAccount', (api: ReturnType<typeof handlers>) => api.upsertAccount({ id: null, label: 'A', email: 'a@example.test', note: null, extra: true })],
    ['upsertAccount with a path', (api: ReturnType<typeof handlers>) => api.upsertAccount('C:\\Users\\x\\.config')],
    ['removeAccount', (api: ReturnType<typeof handlers>) => api.removeAccount('../registry.json')],
    ['recordManualSnapshot', (api: ReturnType<typeof handlers>) => api.recordManualSnapshot({ ...snapshotInput(), weeklyRemainingPercent: 150 })],
    ['setReportedActive', (api: ReturnType<typeof handlers>) => api.setReportedActive(42)]
  ])('rejects invalid %s arguments without writing', async (_name, call) => {
    const result = parseAccountsResult(await call(handlers()));
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(await readdir(directory)).toEqual([]);
  });

  it('returns an empty registry before anything is saved', async () => {
    expect(parseAccountsResult(await handlers().getState())).toMatchObject({ ok: true, data: { accounts: [] } });
  });
});
