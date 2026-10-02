// Purpose: Capture instrumented tool interactions and minimize failure fixtures under strict offline replay.
import { fingerprint } from '@gbesse/decisionpacks';
import { ensure, nonempty, snapshot, bounded } from './contracts.mjs';
const errorRecord = error => ({ name: String(error?.name ?? 'Error'), message: String(error?.message ?? error) });
export class ReplayMismatch extends Error { constructor(message) { super(message); this.name = 'ReplayMismatch'; } }
async function outcome(run, context, options) {
  try { return { status: 'returned', value: snapshot(await bounded(signal => run({ ...context, signal }), options)) }; }
  catch (error) { if (error instanceof ReplayMismatch || options.signal?.aborted) throw error; return { status: 'threw', error: errorRecord(error) }; }
}
export async function record(run, input, tools, { workflowId = 'workflow', timeoutMs = 30_000, signal, maxEvents = 1000 } = {}) {
  ensure(typeof run === 'function' && nonempty(workflowId), 'Provide a workflow and identity');
  ensure(Number.isSafeInteger(maxEvents) && maxEvents > 0 && maxEvents <= 10000, 'Invalid event budget');
  const capsule = { schemaVersion: 1, workflowId, input: snapshot(input), events: [], outcome: null };
  let active = true, pending = false, runSignal = signal;
  const call = async (name, args) => {
    ensure(active, 'Workflow is no longer active'); ensure(!pending, 'Concurrent calls are unsupported in schema v1');
    ensure(nonempty(name) && Object.hasOwn(tools, name) && typeof tools[name] === 'function', 'Unknown tool');
    ensure(capsule.events.length < maxEvents, 'Event budget exhausted');
    const event = { name, args: snapshot(args), outcome: null }; capsule.events.push(event); pending = true;
    try {
      const value = snapshot(await bounded(s => tools[name](snapshot(event.args), { signal: s }), { timeoutMs, signal: runSignal }));
      event.outcome = { status: 'returned', value }; return snapshot(value);
    } catch (error) { event.outcome = { status: 'threw', error: errorRecord(error) }; throw error; }
    finally { pending = false; }
  };
  try { capsule.outcome = await outcome(context => { runSignal = context.signal; return run(context); }, { input: snapshot(input), call }, { timeoutMs, signal }); }
  finally { active = false; }
  // A detached/in-flight tool has an ambiguous result and cannot form a reproducible capsule.
  ensure(!pending && capsule.events.every(e => e.outcome), 'Workflow ended with an unfinished tool; no capsule produced');
  return snapshot(capsule);
}
export function validateCapsule(capsule) {
  snapshot(capsule);
  ensure(capsule?.schemaVersion === 1 && nonempty(capsule.workflowId) && Array.isArray(capsule.events), 'Invalid capsule');
  const validOutcome = result => result && (result.status === 'returned' && Object.hasOwn(result, 'value') || result.status === 'threw' && nonempty(result.error?.name) && typeof result.error.message === 'string');
  ensure(validOutcome(capsule.outcome), 'Invalid workflow outcome');
  for (const e of capsule.events) ensure(nonempty(e.name) && Object.hasOwn(e, 'args') && validOutcome(e.outcome), 'Invalid event');
  return capsule;
}
export async function replay(run, capsule, { workflowId = capsule.workflowId, timeoutMs = 30_000, signal } = {}) {
  capsule = snapshot(validateCapsule(capsule)); ensure(workflowId === capsule.workflowId, 'Workflow identity mismatch');
  let position = 0, mismatch = null, active = true;
  const fail = message => { mismatch = new ReplayMismatch(message); throw mismatch; };
  const call = async (name, args) => {
    if (!active) return fail('Workflow is no longer active');
    const event = capsule.events[position++];
    if (!event || event.name !== name || fingerprint(snapshot(args)) !== fingerprint(event.args)) return fail(`Tool trace diverged at event ${position}`);
    if (event.outcome.status === 'threw') { const error = new Error(event.outcome.error.message); error.name = event.outcome.error.name; throw error; }
    return snapshot(event.outcome.value);
  };
  let result;
  try { result = await outcome(run, { input: snapshot(capsule.input), call }, { timeoutMs, signal }); }
  finally { active = false; }
  if (mismatch) throw mismatch;
  if (position !== capsule.events.length) throw new ReplayMismatch('Recorded events were not consumed');
  return { reproduced: fingerprint(result) === fingerprint(capsule.outcome), outcome: result, consumedEvents: position };
}
function validatePath(path) {
  ensure(Array.isArray(path) && path.every(part => typeof part === 'string' || Number.isSafeInteger(part) && part >= 0), 'Invalid handoff path');
  return path;
}
function atPath(value, path) {
  let current = value;
  for (const part of path) {
    if (!current || typeof current !== 'object' || !Object.hasOwn(current, part)) return { found: false };
    current = current[part];
  }
  return { found: true, value: current };
}
export function verifyHandoffs(capsule, bindings) {
  capsule = snapshot(validateCapsule(capsule));
  bindings = snapshot(bindings);
  ensure(Array.isArray(bindings) && bindings.length > 0, 'Provide at least one handoff binding');
  const checks = bindings.map((binding, bindingIndex) => {
    ensure(binding && typeof binding === 'object', 'Invalid handoff binding');
    const producer = binding.producer, consumer = binding.consumer;
    ensure(Number.isSafeInteger(producer?.eventIndex) && Number.isSafeInteger(consumer?.eventIndex) && producer.eventIndex >= 0 && consumer.eventIndex > producer.eventIndex && consumer.eventIndex < capsule.events.length, 'Invalid handoff event order');
    const producerPath = validatePath(producer.path), consumerPath = validatePath(consumer.path);
    const sourceEvent = capsule.events[producer.eventIndex], targetEvent = capsule.events[consumer.eventIndex];
    if (sourceEvent.outcome.status !== 'returned') return { bindingIndex, producerEventIndex: producer.eventIndex, consumerEventIndex: consumer.eventIndex, matched: false, reason: 'producer_did_not_return' };
    const source = atPath(sourceEvent.outcome.value, producerPath);
    if (!source.found) return { bindingIndex, producerEventIndex: producer.eventIndex, consumerEventIndex: consumer.eventIndex, matched: false, reason: 'producer_path_missing' };
    const target = atPath(targetEvent.args, consumerPath);
    if (!target.found) return { bindingIndex, producerEventIndex: producer.eventIndex, consumerEventIndex: consumer.eventIndex, matched: false, reason: 'consumer_path_missing' };
    const matched = fingerprint(source.value) === fingerprint(target.value);
    return { bindingIndex, producerEventIndex: producer.eventIndex, consumerEventIndex: consumer.eventIndex, matched, reason: matched ? 'matched' : 'value_mismatch' };
  });
  return { passed: checks.every(check => check.matched), checks };
}
export function reductionCandidates(capsule) {
  validateCapsule(capsule); const result = [];
  capsule.events.forEach((e, index) => { if (e.outcome.status === 'returned' && e.outcome.value && typeof e.outcome.value === 'object' && !Array.isArray(e.outcome.value)) for (const key of Object.keys(e.outcome.value)) result.push({ eventIndex: index, key }); });
  return result;
}
export async function minimize(run, capsule, { ranker, maxAttempts = 100, timeoutMs = 30_000, signal } = {}) {
  let current = snapshot(validateCapsule(capsule));
  ensure(current.outcome.status === 'threw', 'Minimization requires a captured failure');
  ensure(Number.isSafeInteger(maxAttempts) && maxAttempts > 0 && maxAttempts <= 1000, 'Invalid attempt budget');
  ensure((await replay(run, current, { timeoutMs, signal })).reproduced, 'Original failure does not reproduce');
  let candidates = reductionCandidates(current);
  if (ranker) {
    const ranked = snapshot(await bounded(s => ranker(snapshot(candidates), snapshot(current), { signal: s }), { timeoutMs, signal }));
    ensure(Array.isArray(ranked) && ranked.length === candidates.length && new Set(ranked.map(fingerprint)).size === candidates.length && ranked.every(c => candidates.some(x => fingerprint(x) === fingerprint(c))), 'Ranker must return a permutation of candidates'); candidates = ranked;
  }
  let attempts = 0; const removed = [];
  for (const candidate of candidates) {
    if (attempts >= maxAttempts) break; attempts++;
    const trial = snapshot(current); delete trial.events[candidate.eventIndex].outcome.value[candidate.key];
    let check;
    try { check = await replay(run, trial, { timeoutMs, signal }); }
    catch (error) { if (error instanceof ReplayMismatch) continue; throw error; }
    if (check.reproduced) { current = trial; removed.push(candidate); }
  }
  return { capsule: current, attempts, removed, exhausted: attempts < candidates.length, guarantee: 'same_recorded_failure_with_strict_tool_trace' };
}
