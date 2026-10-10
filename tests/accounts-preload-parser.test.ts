import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';
import { beforeAll, describe, expect, it } from 'vitest';
import { accountChannels } from '../src/shared/accounts-contracts';
import { parseAccountsResult } from '../src/shared/accounts-validation';
import { ACCOUNT_A, ACCOUNT_B, baseState, snapshot } from './accounts-fixtures';

// Runs the real electron/preload.cts (type-stripped, otherwise unchanged) in a separate
// VM context with a fake `electron` module. Electron itself is not started and its
// isolation settings are not touched.

type Invoke = (channel: string, ...args: unknown[]) => Promise<unknown>;
type PreloadAccounts = {
  getState(): Promise<unknown>;
  upsertAccount(input: unknown): Promise<unknown>;
  removeAccount(accountId: unknown): Promise<unknown>;
  recordManualSnapshot(input: unknown): Promise<unknown>;
  setReportedActive(accountId: unknown): Promise<unknown>;
};

let preloadCode: string;

beforeAll(async () => {
  const source = await readFile(path.join(__dirname, '..', 'electron', 'preload.cts'), 'utf8');
  preloadCode = (await transformWithOxc(source, 'preload.cts', { lang: 'ts' })).code;
});

const loadPreload = (invoke: Invoke): PreloadAccounts => {
  const exposed: Record<string, unknown> = {};
  const electron = {
    contextBridge: { exposeInMainWorld: (key: string, api: unknown) => { exposed[key] = api; } },
    ipcRenderer: { invoke }
  };
  const fakeRequire = (name: string) => {
    if (name !== 'electron') throw new Error(`Unexpected module: ${name}`);
    return electron;
  };
  vm.runInNewContext(preloadCode, { require: fakeRequire }, { filename: 'preload.cts' });
  return (exposed.doctor as { accounts: PreloadAccounts }).accounts;
};

/** Parses one main-process response with the preload copy. Results are copied out of the VM realm. */
const preloadParse = async (response: unknown): Promise<unknown> => {
  const accounts = loadPreload(async () => response);
  return JSON.parse(JSON.stringify(await accounts.getState()));
};

const okResponse = (data: unknown) => ({ ok: true, data });
const state = baseState;
const snapshots = (count: number) => Array.from({ length: count }, (_, index) =>
  snapshot({ observedAt: new Date(Date.UTC(2026, 9, 1, index)).toISOString() }));

const cases: Array<[string, unknown]> = [
  ['a valid registry', okResponse(state())],
  ['a valid registry with snapshots', okResponse({ ...state(), snapshots: [snapshot({ weeklyRemainingPercent: 40, subscriptionEndsOn: '2026-11-01' })] })],
  ['an empty registry', okResponse({ schemaVersion: 1, accounts: [], reportedActiveAccountId: null, snapshots: [] })],
  ['twenty snapshots for one account', okResponse({ ...state(), snapshots: snapshots(20) })],
  ['a passed-through error', { ok: false, error: { code: 'DUPLICATE_EMAIL', message: 'Already registered.' } }],
  ['an error without a message', { ok: false, error: { code: 'X' } }],
  ['a non-object', 'registry'],
  ['a missing ok flag', { data: state() }],
  ['an unknown schema version', okResponse({ ...state(), schemaVersion: 2 })],
  ['an extra top-level key', okResponse({ ...state(), path: 'C:\\Users\\x' })],
  ['an extra account key', okResponse({ ...state(), accounts: [{ ...state().accounts[0], token: 'x' }] })],
  ['a missing account key', okResponse({ ...state(), accounts: [{ id: ACCOUNT_A, label: 'A', email: 'a@example.test', note: null }] })],
  ['an empty label', okResponse({ ...state(), accounts: [{ ...state().accounts[0], label: '  ' }] })],
  ['a label over 60 characters', okResponse({ ...state(), accounts: [{ ...state().accounts[0], label: 'x'.repeat(61) }] })],
  ['an invalid email', okResponse({ ...state(), accounts: [{ ...state().accounts[0], email: 'not-an-email' }] })],
  ['a note over 500 characters', okResponse({ ...state(), accounts: [{ ...state().accounts[0], note: 'x'.repeat(501) }] })],
  ['duplicate account ids', okResponse({ ...state(), accounts: [state().accounts[0], { ...state().accounts[1], id: ACCOUNT_A }] })],
  ['duplicate emails differing in case', okResponse({ ...state(), accounts: [state().accounts[0], { ...state().accounts[1], email: 'KONTO1@example.test' }] })],
  ['an active id that matches no account', okResponse({ ...state(), reportedActiveAccountId: '33333333-3333-4333-8333-333333333333' })],
  ['a snapshot for an unknown account', okResponse({ ...state(), snapshots: [snapshot({ accountId: '33333333-3333-4333-8333-333333333333' })] })],
  ['more than twenty snapshots for one account', okResponse({ ...state(), snapshots: snapshots(21) })],
  ['a percentage over 100', okResponse({ ...state(), snapshots: [snapshot({ weeklyRemainingPercent: 101 })] })],
  ['a fractional percentage', okResponse({ ...state(), snapshots: [snapshot({ fiveHourRemainingPercent: 12.5 })] })],
  ['a reset count over 99', okResponse({ ...state(), snapshots: [snapshot({ resetCreditsRemaining: 100 })] })],
  ['an impossible calendar date', okResponse({ ...state(), snapshots: [snapshot({ subscriptionEndsOn: '2026-02-30' })] })],
  ['an instant without a time zone', okResponse({ ...state(), snapshots: [snapshot({ observedAt: '2026-10-10T08:00:00' })] })],
  ['a non-manual source', okResponse({ ...state(), snapshots: [{ ...snapshot(), source: 'live' }] })],
  ['an unknown renewal value', okResponse({ ...state(), snapshots: [{ ...snapshot(), subscriptionRenewal: 'maybe' }] })]
];

describe('preload account response parser', () => {
  it.each(cases)('agrees with the shared parser on %s', async (_name, response) => {
    expect(await preloadParse(response)).toEqual(JSON.parse(JSON.stringify(parseAccountsResult(response))));
  });

  it('accepts the valid fixtures and rejects the invalid ones', async () => {
    expect(await preloadParse(okResponse(state()))).toMatchObject({ ok: true });
    expect(await preloadParse(okResponse({ ...state(), snapshots: [snapshot({ subscriptionEndsOn: '2026-02-30' })] })))
      .toMatchObject({ ok: false, error: { code: 'INVALID_ACCOUNTS_PAYLOAD' } });
  });
});

describe('preload account API', () => {
  it('uses the documented channels and forwards arguments unchanged', async () => {
    const calls: Array<[string, unknown[]]> = [];
    const accounts = loadPreload(async (channel, ...args) => {
      calls.push([channel, args]);
      return okResponse(state());
    });
    const input = { id: null, label: 'A', email: 'a@example.test', note: null };

    await accounts.getState();
    await accounts.upsertAccount(input);
    await accounts.removeAccount(ACCOUNT_B);
    await accounts.recordManualSnapshot({ accountId: ACCOUNT_A });
    await accounts.setReportedActive(null);

    expect(calls.map(([channel]) => channel)).toEqual([
      accountChannels.getState,
      accountChannels.upsertAccount,
      accountChannels.removeAccount,
      accountChannels.recordManualSnapshot,
      accountChannels.setReportedActive
    ]);
    expect(calls.map(([, args]) => JSON.parse(JSON.stringify(args)))).toEqual([[], [input], [ACCOUNT_B], [{ accountId: ACCOUNT_A }], [null]]);
  });
});
