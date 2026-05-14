// SPDX-License-Identifier: MIT
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string;
};

function readGitCommit(): string {
  try {
    const head = readFileSync(new URL('.git/HEAD', import.meta.url), 'utf-8').trim();
    const ref = head.startsWith('ref: ') ? head.slice(5) : null;
    const sha = ref ? readFileSync(new URL(`.git/${ref}`, import.meta.url), 'utf-8').trim() : head;
    return sha.slice(0, 7);
  } catch {
    return 'unknown';
  }
}

export const appVersion: string = pkg.version;
export const appCommit: string = readGitCommit();
