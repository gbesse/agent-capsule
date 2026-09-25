// Purpose: Verify that replay and fixture reduction preserve observed failures without invoking tools.
import test from 'node:test';
import assert from 'node:assert/strict';
import { record, replay, minimize, verifyHandoffs, ReplayMismatch } from '../src/index.mjs';
const run = async ({ input, call }) => { const result = await call('stock', { sku: input.sku }); if (result.available === 0) throw new Error('out of stock'); return { available: result.available }; };
const capture = () => record(run, { sku: 'fixture' }, { stock: async () => ({ available: 0, noise: 'remove me', nested: { irrelevant: true } }) });
test('offline replay reproduces a captured failure without a live tool registry', async () => { const c = await capture(); assert.equal(c.outcome.status, 'threw'); assert.equal((await replay(run, c)).reproduced, true); });
test('minimization removes irrelevant fields while retaining the cause', async () => { const r = await minimize(run, await capture()); assert.deepEqual(r.capsule.events[0].outcome.value, { available: 0 }); assert.equal(r.removed.length, 2); assert.equal((await replay(run, r.capsule)).reproduced, true); });
test('wrong name, args and unconsumed events reject even when workflow catches them', async () => { const c = await capture(); await assert.rejects(replay(async ({ call }) => { try { await call('wrong', {}); } catch {} throw new Error('out of stock'); }, c), ReplayMismatch); await assert.rejects(replay(async () => { throw new Error('out of stock'); }, c), /not consumed/); await assert.rejects(replay(run, c, { workflowId: 'changed' }), /identity/); });
test('changed final error is not reproduced', async () => { const c = await capture(); const changed = async ({ call }) => { await call('stock', { sku: 'fixture' }); throw new Error('different'); }; assert.equal((await replay(changed, c)).reproduced, false); });
test('recorded tool errors are replayed by name and message', async () => { const workflow = async ({ call }) => { try { await call('broken', {}); } catch (e) { return { name: e.name, message: e.message }; } }; const c = await record(workflow, {}, { broken: async () => { throw new TypeError('bad response'); } }); assert.equal((await replay(workflow, c)).reproduced, true); });
test('success capsules cannot be minimized, malformed rankers fail', async () => { const success = await record(async () => ({ ok: true }), {}, {}); await assert.rejects(minimize(async () => ({}), success), /captured failure/); await assert.rejects(minimize(run, await capture(), { ranker: async () => [] }), /permutation/); });
test('attempt budget bounds reduction and cancellation propagates', async () => { const r = await minimize(run, await capture(), { maxAttempts: 1 }); assert.equal(r.attempts, 1); assert.equal(r.exhausted, true); await assert.rejects(replay(run, await capture(), { signal: AbortSignal.abort(new Error('cancelled')) }), /cancelled/); });
test('tool arguments and return values are captured as independent snapshots', async () => { let args; const c = await record(async ({ call }) => { args = { id: 1 }; const pending = call('echo', args); args.id = 2; const result = await pending; result.extra = true; return result; }, {}, { echo: async x => x }); assert.equal(c.events[0].args.id, 1); assert.deepEqual(c.events[0].outcome.value, { id: 1 }); });
test('handoff bindings prove an exact returned value reached a later call', async () => {
  const workflow = async ({ call }) => { const created = await call('create', { name: 'Alpha' }); return call('fetch', { record: { id: created.record.id } }); };
  const capsule = await record(workflow, {}, { create: async () => ({ record: { id: 'rec-7' } }), fetch: async ({ record }) => ({ id: record.id }) });
  const binding = { producer: { eventIndex: 0, path: ['record', 'id'] }, consumer: { eventIndex: 1, path: ['record', 'id'] } };
  assert.deepEqual(verifyHandoffs(capsule, [binding]), { passed: true, checks: [{ bindingIndex: 0, producerEventIndex: 0, consumerEventIndex: 1, matched: true, reason: 'matched' }] });
  const changed = structuredClone(capsule); changed.events[1].args.record.id = 'rec-8';
  assert.equal(verifyHandoffs(changed, [binding]).checks[0].reason, 'value_mismatch');
});
test('handoff verification fails closed on missing paths and invalid order', async () => {
  const capsule = await record(async ({ call }) => { const result = await call('create', {}); return call('fetch', { id: result.id }); }, {}, { create: async () => ({ id: 42 }), fetch: async args => args });
  const missing = verifyHandoffs(capsule, [{ producer: { eventIndex: 0, path: ['missing'] }, consumer: { eventIndex: 1, path: ['id'] } }]);
  assert.equal(missing.passed, false); assert.equal(missing.checks[0].reason, 'producer_path_missing');
  assert.throws(() => verifyHandoffs(capsule, [{ producer: { eventIndex: 1, path: [] }, consumer: { eventIndex: 0, path: [] } }]), /event order/);
});
