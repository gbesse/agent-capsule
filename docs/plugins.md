# Plugin contracts

This document defines the version 0.1 extension interfaces and their trust boundaries.

## Workflow and tools

Export async `run({ input, call, signal })` plus a `tools` object. Each tool is async `(args, { signal }) => jsonValue`. Route all external I/O through sequential awaited `call(name, args)` operations. Return JSON, including `null` rather than `undefined` for a void result. Throws capture the error's name and message, not stack or arbitrary custom properties.

CLI source identity hashes the main workflow file only. Keep imported dependencies pinned; do not assume that source identity authenticates a package or freezes its environment.

## Candidate ranker

API: `minimize(run, capsule, { ranker, maxAttempts, timeoutMs, signal })`. A ranker is async `(candidates, capsule, { signal }) => reorderedCandidates`, where candidates are `{ eventIndex, key }`. Return an exact permutation: do not insert, drop or duplicate a candidate. Ranking cannot approve a reduction; strict replay must still reproduce the original failure.

`createJevRanker({ provider })` implements the ranking contract using batches of up to 32 noul questions. It receives the complete capsule. It makes no causal proof claim.

## Shared rules

Modules loaded by path are trusted executable code, not data or sandboxed extensions. All portable values must be finite acyclic JSON. Async hooks default to a 30-second deadline and receive an AbortSignal. Deadlines stop waiting; synchronous loops or effects that ignore cancellation cannot be forcibly stopped in-process. External requests need explicit network timeouts. Errors propagate to the caller; the embedding application owns administrator alerting and must not silently fabricate a successful result.

Provider injection uses `createJevProvider` from the pinned DecisionPacks dependency. Use loopback HTTP fixtures for integration tests. Do not commit provider keys, production records or personal data in contributed examples.
