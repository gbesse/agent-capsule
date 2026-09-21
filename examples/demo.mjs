// Purpose: Record, replay and minimize a synthetic workflow with no external tools or model calls.
import { record, replay, minimize } from '../src/index.mjs';
import { run, tools } from './failing-workflow.mjs';
const capsule = await record(run, { sku: 'DEMO-1' }, tools);
const reduced = await minimize(run, capsule);
console.log(JSON.stringify({ source: 'synthetic offline workflow', replay: await replay(run, capsule), removedFields: reduced.removed, remainingToolReply: reduced.capsule.events[0].outcome.value }, null, 2));
