import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// K1 must not reach Codex state, credentials or processes. This guards the source of every K1 module.

const root = path.resolve(__dirname, '..');
const k1Sources = async (): Promise<string[]> => {
  const accountDirs = ['electron/services/accounts', 'src/accounts'];
  const files = ['electron/ipc/account-handlers.ts', 'src/shared/accounts-contracts.ts', 'src/shared/accounts-validation.ts', 'src/shared/accounts-capacity.ts'];
  for (const directory of accountDirs) {
    for (const entry of await readdir(path.join(root, directory))) files.push(path.join(directory, entry));
  }
  return files;
};

const forbidden = ['auth.json', '.codex', 'CODEX_HOME', 'app-server', 'child_process', 'powershell', 'execFile', 'spawn(', 'fetch(', 'XMLHttpRequest', 'token'];

describe('K1 isolation', () => {
  it('contains no reference to Codex credentials, processes or network access', async () => {
    const files = await k1Sources();
    expect(files.length).toBeGreaterThanOrEqual(12);
    const offenders: string[] = [];
    for (const file of files) {
      const source = (await readFile(path.join(root, file), 'utf8')).toLowerCase();
      for (const term of forbidden) {
        if (source.includes(term.toLowerCase())) offenders.push(`${file}: ${term}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
