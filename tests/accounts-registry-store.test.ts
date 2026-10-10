import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setReportedActive, upsertAccount } from '../electron/services/accounts/account-operations';
import { REGISTRY_FILE_NAME, createRegistryStore, nodeRegistryFileOps } from '../electron/services/accounts/registry-store';
import { ACCOUNT_A, baseState } from './accounts-fixtures';

let directory: string;

beforeEach(async () => { directory = await mkdtemp(path.join(tmpdir(), 'doctor-accounts-')); });
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });

const registryPath = () => path.join(directory, REGISTRY_FILE_NAME);
const addAccount = (email: string, id: string) => (state: ReturnType<typeof baseState>) =>
  upsertAccount(state, { id: null, label: email, email, note: null }, { newId: id, now: new Date('2026-10-10T08:00:00Z') });

describe('createRegistryStore', () => {
  it('returns an empty registry when no file exists, without creating one', async () => {
    const store = createRegistryStore(directory);
    expect(await store.read()).toEqual({ ok: true, data: { schemaVersion: 1, accounts: [], reportedActiveAccountId: null, snapshots: [] } });
    expect(await readdir(directory)).toEqual([]);
  });

  it('persists an update and reads it back after a restart', async () => {
    const result = await createRegistryStore(directory).update(addAccount('konto1@example.test', ACCOUNT_A));
    expect(result.ok).toBe(true);
    const reread = await createRegistryStore(directory).read();
    expect(reread.ok && reread.data.accounts.map((account) => account.id)).toEqual([ACCOUNT_A]);
    expect(await readdir(directory)).toEqual([REGISTRY_FILE_NAME]);
  });

  it('refuses to overwrite a registry that is not valid JSON', async () => {
    await writeFile(registryPath(), '{ broken', 'utf8');
    const store = createRegistryStore(directory);
    expect(await store.read()).toMatchObject({ ok: false, error: { code: 'REGISTRY_UNREADABLE' } });
    expect(await store.update(addAccount('konto1@example.test', ACCOUNT_A))).toMatchObject({ ok: false, error: { code: 'REGISTRY_UNREADABLE' } });
    expect(await readFile(registryPath(), 'utf8')).toBe('{ broken');
  });

  it('refuses to overwrite a registry that fails validation', async () => {
    const invalid = JSON.stringify({ ...baseState(), schemaVersion: 99 });
    await writeFile(registryPath(), invalid, 'utf8');
    expect(await createRegistryStore(directory).update((state) => setReportedActive(state, null))).toMatchObject({ ok: false, error: { code: 'REGISTRY_UNREADABLE' } });
    expect(await readFile(registryPath(), 'utf8')).toBe(invalid);
  });

  it('keeps the previous registry and removes the temporary file when the final rename fails', async () => {
    await createRegistryStore(directory).update(addAccount('konto1@example.test', ACCOUNT_A));
    const before = await readFile(registryPath(), 'utf8');

    const failing = createRegistryStore(directory, {
      ...nodeRegistryFileOps,
      rename: async () => { throw Object.assign(new Error('simulated'), { code: 'EPERM' }); }
    });
    const result = await failing.update((state) => setReportedActive(state, null));

    expect(result).toMatchObject({ ok: false, error: { code: 'REGISTRY_WRITE_FAILED' } });
    expect(await readFile(registryPath(), 'utf8')).toBe(before);
    expect(await readdir(directory)).toEqual([REGISTRY_FILE_NAME]);
  });

  it('reports an unreadable registry when the registry path is a directory and writes nothing', async () => {
    await mkdir(registryPath());
    const store = createRegistryStore(directory);
    expect(await store.read()).toMatchObject({ ok: false, error: { code: 'REGISTRY_UNREADABLE' } });
    expect(await store.update(addAccount('konto1@example.test', ACCOUNT_A))).toMatchObject({ ok: false, error: { code: 'REGISTRY_UNREADABLE' } });
    expect(await readdir(directory)).toEqual([REGISTRY_FILE_NAME]);
  });

  it('removes the temporary file and keeps the registry when writing the temporary file fails', async () => {
    await createRegistryStore(directory).update(addAccount('konto1@example.test', ACCOUNT_A));
    const before = await readFile(registryPath(), 'utf8');
    const failing = createRegistryStore(directory, {
      ...nodeRegistryFileOps,
      writeFileDurably: async (filePath, contents) => {
        await writeFile(filePath, contents.slice(0, 10), 'utf8');
        throw Object.assign(new Error('simulated'), { code: 'ENOSPC' });
      }
    });
    expect(await failing.update((state) => setReportedActive(state, null))).toMatchObject({ ok: false, error: { code: 'REGISTRY_WRITE_FAILED' } });
    expect(await readFile(registryPath(), 'utf8')).toBe(before);
    expect(await readdir(directory)).toEqual([REGISTRY_FILE_NAME]);
  });

  it('never includes file paths or system error text in error messages', async () => {
    const failing = createRegistryStore(directory, {
      ...nodeRegistryFileOps,
      readFile: async () => { throw Object.assign(new Error(`EACCES: permission denied, open '${registryPath()}'`), { code: 'EACCES' }); }
    });
    const result = await failing.read();
    expect(result.ok).toBe(false);
    const message = result.ok ? '' : result.error.message;
    expect(message).not.toContain(directory);
    expect(message).not.toContain('EACCES');
  });

  // Creating symlinks needs extra privileges on Windows, so this runs on POSIX only.
  it.skipIf(process.platform === 'win32')('replaces a link at the registry path instead of writing through it', async () => {
    const outside = await mkdtemp(path.join(tmpdir(), 'doctor-outside-'));
    try {
      const target = path.join(outside, 'target.json');
      const original = `${JSON.stringify(baseState(), null, 2)}\n`;
      await writeFile(target, original, 'utf8');
      await symlink(target, registryPath());

      const result = await createRegistryStore(directory).update((state) => setReportedActive(state, null));
      expect(result.ok).toBe(true);
      expect(await readFile(target, 'utf8')).toBe(original);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });

  it('does not write when a transition is rejected', async () => {
    const store = createRegistryStore(directory);
    expect(await store.update((state) => setReportedActive(state, ACCOUNT_A))).toMatchObject({ ok: false, error: { code: 'ACCOUNT_NOT_FOUND' } });
    expect(await readdir(directory)).toEqual([]);
  });

  it('serializes concurrent updates so none is lost', async () => {
    const store = createRegistryStore(directory);
    const ids = ['55555555-5555-4555-8555-555555555551', '55555555-5555-4555-8555-555555555552', '55555555-5555-4555-8555-555555555553'];
    const results = await Promise.all(ids.map((id, index) => store.update(addAccount(`konto${index}@example.test`, id))));
    expect(results.every((result) => result.ok)).toBe(true);
    const final = await store.read();
    expect(final.ok && final.data.accounts.map((account) => account.id).sort()).toEqual(ids);
  });
});
