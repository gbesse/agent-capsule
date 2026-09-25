// Purpose: Verify the public CLI produces parseable artifacts and refuses to overwrite them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
test('CLI writes a portable artifact, offers help and refuses overwrite', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'agent-capsule-test-')), output = join(folder, 'result.json');
  const invoke = args => spawnSync(process.execPath, ['bin/agent-capsule.mjs', ...args], { encoding: 'utf8', timeout: 10000 });
  try {
    assert.equal(invoke(['--help']).status, 0);
    const args = ['record', 'examples/failing-workflow.mjs', 'examples/input.json', output];
    const first = invoke(args); assert.equal(first.status, 0, first.stderr);
    assert.equal(JSON.parse(await readFile(output, 'utf8')).schemaVersion, 1);
    const second = invoke(args); assert.equal(second.status, 1); assert.match(second.stderr, /EEXIST/);
  } finally { await rm(folder, { recursive: true, force: true }); }
});
test('CLI reports failed handoff provenance with a distinct exit status', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'agent-capsule-handoff-')), capsulePath = join(folder, 'capsule.json'), bindingsPath = join(folder, 'bindings.json');
  const invoke = args => spawnSync(process.execPath, ['bin/agent-capsule.mjs', ...args], { encoding: 'utf8', timeout: 10000 });
  const capsule = { schemaVersion: 1, workflowId: 'fixture', input: {}, events: [{ name: 'create', args: {}, outcome: { status: 'returned', value: { id: 'a' } } }, { name: 'fetch', args: { id: 'b' }, outcome: { status: 'returned', value: {} } }], outcome: { status: 'returned', value: {} } };
  const bindings = [{ producer: { eventIndex: 0, path: ['id'] }, consumer: { eventIndex: 1, path: ['id'] } }];
  try {
    await Promise.all([writeFile(capsulePath, JSON.stringify(capsule)), writeFile(bindingsPath, JSON.stringify(bindings))]);
    const result = invoke(['handoffs', capsulePath, bindingsPath]);
    assert.equal(result.status, 2, result.stderr); assert.equal(JSON.parse(result.stdout).checks[0].reason, 'value_mismatch');
  } finally { await rm(folder, { recursive: true, force: true }); }
});
