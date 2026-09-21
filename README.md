# Agent Capsule

Capture an instrumented workflow failure, replay its tool trace offline, and shrink tool responses while preserving the same observed failure.

[![Tests](https://github.com/gbesse/agent-capsule/actions/workflows/test.yml/badge.svg)](https://github.com/gbesse/agent-capsule/actions/workflows/test.yml)

**Alpha · MIT · Node.js 22+ · no build required.** The included recorder, strict replay and field reducer work without a model. Optional Jev ranks candidate removals; replay alone decides which removals are accepted.

## Try it

```sh
git clone https://github.com/gbesse/agent-capsule.git
cd agent-capsule
npm ci --ignore-scripts
npm run demo
node bin/agent-capsule.mjs record examples/failing-workflow.mjs examples/input.json /tmp/capsule.json
node bin/agent-capsule.mjs replay examples/failing-workflow.mjs /tmp/capsule.json
node bin/agent-capsule.mjs minimize examples/failing-workflow.mjs /tmp/capsule.json /tmp/small-capsule.json
```

The synthetic stock failure loses three irrelevant response fields but retains `available: 0` and the same error. `record` really invokes the tool functions supplied by the workflow module. `replay` supplies recorded responses through `call`; it does not invoke a live tool registry.

Install with `npm install github:gbesse/agent-capsule#v0.1.0`.

## Workflow contract

```js
export async function run({ input, call, signal }) {
  const stock = await call('stock', { sku: input.sku });
  if (stock.available === 0) throw new Error('out of stock');
  return { reserved: true };
}
export const tools = {
  stock: async (args, { signal }) => ({ available: 0, debug: 'fixture' }),
};
```

All inputs, arguments, results and returns must be finite acyclic JSON. Calls must be sequential and awaited. Run `record`, `replay` and `minimize` from `@gbesse/agent-capsule` to embed the same contracts. Type declarations and [plugin contracts](docs/plugins.md) describe the API.

Replay requires the same call names, order and arguments and the same final return value or error name/message. Caught trace divergences still invalidate replay. The CLI pins the workflow file's source hash; imported dependencies and runtime environment are not bundled or fingerprinted. Pin those separately.

## Reduction scope

The alpha removes top-level fields from returned tool objects, one candidate at a time. It preserves the original call trace and failure name/message. It does not minimize code, arbitrary event sequences, inputs or nested fields, and it does not prove a globally minimal or causally equivalent bug. `maxAttempts` defaults to 100, capped at 1000. Replay has a default 30-second deadline; CPU-bound or uncooperative code cannot be preempted in-process.

With `TYPESAFE_API_KEY` set, add `--jev` to the minimize command to send the capsule to pinned `jev-1.13.0` for ranking. One request contains at most 32 field questions. The ranking stage has an overall deadline when invoked by the reducer. Capsules may contain secrets; review/redact them before publishing or sending them to a provider.

## Trust boundary

A capsule contains data, not runnable source. The workflow module is separately supplied **trusted executable code**. It can bypass `call` and perform direct I/O; this library is not a sandbox or general deterministic agent runtime. Move every external dependency behind `call` before expecting offline replay. Do not automatically retry external effects after a deadline: completion may be ambiguous.

## Validation

```sh
npm run typecheck
npm run check
npm test
npm run demo
```

Tests cover failure reproduction, argument drift, caught mismatches, field minimization, immutable snapshots, CLI behavior and loopback Jev HTTP integration. No live model accuracy is claimed. See [SECURITY.md](SECURITY.md).

## Where this can grow

A portable, redacted failure corpus and adapters for agent frameworks can make the format useful across organizations. Start with small reproducible capsules and a clear license for each contributed fixture.
