// Purpose: Share explicit CLI JSON reads, private non-overwriting writes and trusted plugin loading.
import { readFile, writeFile, lstat } from 'node:fs/promises';
import { bounded } from './contracts.mjs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
export const readJSON = async path => JSON.parse(await readFile(path, 'utf8'));
export const readText = path => readFile(path, 'utf8');
export async function writeJSON(path, value) { await writeFile(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); }
export const loadPlugin = path => bounded(() => import(pathToFileURL(resolve(path)).href));
// Preflight prevents repeating an external tool merely to discover an existing output later.
// The final exclusive write remains necessary to reject races.
export async function assertNewOutput(path) {
  try { await lstat(path); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  throw new Error('EEXIST: output already exists');
}
