# Evidence note: cross-tool handoff contracts

Date: 2026-09-25

## Problem and target user

Agent and MCP developers can validate each tool separately yet still ship a broken multi-step workflow when an identifier returned by one call is lost, fabricated or replaced before a later call. The target user is a developer with a captured Agent Capsule trace who needs a deterministic CI assertion over that output-to-input handoff.

## Fresh public signals

- A detailed r/mcp report from 21 September describes a create → fetch → update workflow where every individual tool passed but the model failed to carry the created record ID into the next call. The thread converges on exact output-to-input assertions and fail-closed behavior: <https://www.reddit.com/r/mcp/comments/1wm8fp9/everything_worked_until_i_ran_the_full_mcp/>
- MCP SEP-1610 proposes declarative multi-step chains with validated references between earlier results and later arguments, confirming that deterministic cross-step dataflow is a protocol-level gap: <https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1610>
- Agent Footprint documents typed `produces` and `consumes` declarations for checking data legs before a run, an adjacent static approach: <https://agentfootprint.dev/docs/build/artifacts/>
- An MCP discussion asks for portable multi-step execution records because per-call logs do not preserve which earlier output produced a later input: <https://github.com/modelcontextprotocol/modelcontextprotocol/discussions/2493>

## Portfolio and alternatives check

- Agent Capsule already captures exact sequential tool arguments and results, but previously had no assertion over value provenance between calls.
- Decision Conformance tests DecisionPack host behavior; it does not inspect arbitrary tool-result handoffs.
- Jev Proxy enforces each call at the policy boundary; it does not prove that an argument came from a specific earlier result.
- Static `produces`/`consumes` systems and MCP chaining proposals are complementary. Extending Agent Capsule avoids another orchestration format and checks observed traces rather than declarations alone.

## Score

| Dimension | Score | Rationale |
| --- | ---: | --- |
| Pain intensity | 5/5 | Wrong identifiers can mutate or fetch the wrong remote record while all individual tools appear healthy. |
| Evidence quality | 4/5 | One recent detailed reproduction plus multiple independent protocol and tooling signals. |
| Jev fit | 4/5 | Typed, auditable workflow evidence with a deterministic pass/fail decision; no inference is needed for the core check. |
| Differentiation | 3/5 | Adjacent static and orchestration approaches exist; checking actual portable traces is the narrower distinction. |
| Buildability | 5/5 | The existing capsule contains both endpoints of the assertion and supports an offline vertical slice. |
| Distribution potential | 4/5 | A library API and CI-friendly CLI apply across agent frameworks that can instrument calls through Agent Capsule. |
| **Total** | **25/30** | Meets the 24/30 threshold with Jev fit 4/5. |

## Built, boundary and next validation

The MVP adds exact JSON-path bindings from an earlier returned value to a later argument, a structured report, fail-closed input validation, public types, CLI exit codes, tests and an offline demo. It deliberately does not claim causal attribution, semantic correctness, live model reliability or side-effect safety.

Next validation: capture a real agent-driven create → fetch → update workflow with randomized IDs, run it repeatedly, and measure the handoff pass rate without adding a fallback lookup that could mask failures.
