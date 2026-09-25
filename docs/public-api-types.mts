// Purpose: Compile representative public API usage without producing build output.
import { record, replay, minimize, verifyHandoffs, type Workflow, type HandoffBinding } from '../src/index.mjs';
import { createJevRanker } from '../src/jev.mjs';
const run: Workflow = async ({ call }) => call('lookup', { id: 1 });
const capsule = await record(run, {}, { lookup: async () => ({ result: true }) });
await replay(run, capsule);
const bindings: HandoffBinding[] = [{ producer: { eventIndex: 0, path: ['result'] }, consumer: { eventIndex: 1, path: ['id'] } }];
verifyHandoffs(capsule, bindings);
await minimize(run, capsule, { ranker: createJevRanker() });
