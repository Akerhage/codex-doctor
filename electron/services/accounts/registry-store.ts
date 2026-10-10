import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import type { Result } from '../../../src/shared/contracts.js';
import type { AccountsState } from '../../../src/shared/accounts-contracts.js';
import { parseAccountsState } from '../../../src/shared/accounts-validation.js';
import { accountsError, emptyAccountsState } from './account-operations.js';

// Doctor-owned JSON registry. It lives only in the directory the caller supplies
// (Electron userData in production) and never touches Codex files.

export const REGISTRY_FILE_NAME = 'registry.json';

export interface RegistryFileOps {
  readFile(filePath: string): Promise<string>;
  writeFileDurably(filePath: string, contents: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  unlink(filePath: string): Promise<void>;
  mkdir(directory: string): Promise<void>;
}

export const nodeRegistryFileOps: RegistryFileOps = {
  readFile: (filePath) => readFile(filePath, 'utf8'),
  writeFileDurably: async (filePath, contents) => {
    // 'wx' refuses to follow or replace an existing file at the temporary path.
    const handle = await open(filePath, 'wx', 0o600);
    try {
      await handle.writeFile(contents, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
  },
  rename: (from, to) => rename(from, to),
  unlink: (filePath) => unlink(filePath),
  mkdir: async (directory) => { await mkdir(directory, { recursive: true }); }
};

const isMissingFile = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'ENOENT';

export interface RegistryStore {
  read(): Promise<Result<AccountsState>>;
  /** Reads, applies a transition and writes atomically. Calls are serialized. */
  update(transition: (state: AccountsState) => Result<AccountsState>): Promise<Result<AccountsState>>;
}

export const createRegistryStore = (directory: string, fileOps: RegistryFileOps = nodeRegistryFileOps): RegistryStore => {
  const filePath = path.join(directory, REGISTRY_FILE_NAME);
  let queue: Promise<unknown> = Promise.resolve();

  const read = async (): Promise<Result<AccountsState>> => {
    let contents: string;
    try {
      contents = await fileOps.readFile(filePath);
    } catch (error) {
      if (isMissingFile(error)) return { ok: true, data: emptyAccountsState() };
      return accountsError('REGISTRY_UNREADABLE', 'The account registry could not be read. It has not been changed.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(contents);
    } catch {
      return accountsError('REGISTRY_UNREADABLE', 'The account registry is not valid JSON. It has not been changed.');
    }
    const state = parseAccountsState(parsed);
    if (!state) return accountsError('REGISTRY_UNREADABLE', 'The account registry failed validation. It has not been changed.');
    return { ok: true, data: state };
  };

  const write = async (state: AccountsState): Promise<Result<AccountsState>> => {
    const temporaryPath = path.join(directory, `${REGISTRY_FILE_NAME}.${randomUUID()}.tmp`);
    try {
      await fileOps.mkdir(directory);
      await fileOps.writeFileDurably(temporaryPath, `${JSON.stringify(state, null, 2)}\n`);
      await fileOps.rename(temporaryPath, filePath);
      return { ok: true, data: state };
    } catch {
      try { await fileOps.unlink(temporaryPath); } catch { /* the temporary file may not exist */ }
      return accountsError('REGISTRY_WRITE_FAILED', 'The account registry could not be saved. The previous version was kept.');
    }
  };

  const update = (transition: (state: AccountsState) => Result<AccountsState>): Promise<Result<AccountsState>> => {
    const run = async (): Promise<Result<AccountsState>> => {
      const current = await read();
      if (!current.ok) return current;
      const next = transition(current.data);
      if (!next.ok) return next;
      // Never persist a registry that a later read would reject.
      if (!parseAccountsState(next.data)) return accountsError('INVALID_INPUT', 'The change would produce an invalid account registry.');
      return write(next.data);
    };
    const result = queue.then(run, run);
    queue = result.catch(() => undefined);
    return result;
  };

  return { read, update };
};
