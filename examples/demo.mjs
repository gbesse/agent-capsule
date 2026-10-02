// Purpose: Record, replay and minimize a synthetic workflow with no external tools or model calls.
import { record, replay, minimize, verifyHandoffs } from '../src/index.mjs';
import { run, tools } from './failing-workflow.mjs';
const capsule = await record(run, { sku: 'DEMO-1' }, tools);
const reduced = await minimize(run, capsule);
const handoff = await record(async ({ call }) => { const created = await call('create', { name: 'demo' }); return call('fetch', { id: created.id }); }, {}, { create: async () => ({ id: 'record-7' }), fetch: async ({ id }) => ({ id }) });
const handoffs = verifyHandoffs(handoff, [{ producer: { eventIndex: 0, path: ['id'] }, consumer: { eventIndex: 1, path: ['id'] } }]);
console.log(JSON.stringify({ source: 'synthetic offline workflow', replay: await replay(run, capsule), handoffs, removedFields: reduced.removed, remainingToolReply: reduced.capsule.events[0].outcome.value }, null, 2));
