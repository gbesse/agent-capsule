// Purpose: Compile representative public API usage without producing build output.
import { record, replay, minimize, type Workflow } from '../src/index.mjs';
import { createJevRanker } from '../src/jev.mjs';
const run: Workflow = async ({ call }) => call('lookup', { id: 1 });
const capsule = await record(run, {}, { lookup: async () => ({ result: true }) });
await replay(run, capsule);
await minimize(run, capsule, { ranker: createJevRanker() });
