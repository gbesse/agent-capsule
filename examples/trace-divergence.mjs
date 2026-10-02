// Show that a changed tool argument invalidates strict offline replay.
import {record, replay, ReplayMismatch} from '../src/index.mjs';
import {run, tools} from './failing-workflow.mjs';

const capsule = await record(run, {sku: 'DEMO-1'}, tools);
const unchanged = await replay(run, capsule);
async function changedRun({input, call}) {
  const stock = await call('stock', {sku: `${input.sku}-changed`});
  if (stock.available < 1) throw new Error('No stock available');
  return {reserved: true};
}
let divergentRejected = false;
try {
  await replay(changedRun, capsule);
} catch (error) {
  divergentRejected = error instanceof ReplayMismatch;
}
if (!unchanged.reproduced || !divergentRejected) throw new Error('Strict trace demonstration failed');
console.log(JSON.stringify({source: 'synthetic stock fixture; no live tool during replay', unchangedReproduced: unchanged.reproduced, divergentRejected}, null, 2));
