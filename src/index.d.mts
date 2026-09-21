// Purpose: Describe instrumented workflows, replay evidence and bounded fixture reduction.
import type { JSONValue } from '@gbesse/decisionpacks';
export type { JSONValue };
export interface Deadline { timeoutMs?: number; signal?: AbortSignal }
export type Outcome = { status: 'returned'; value: JSONValue } | { status: 'threw'; error: { name: string; message: string } };
export type Tool = (args: JSONValue, options: { signal: AbortSignal }) => Promise<JSONValue>;
export type Workflow = (context: { input: JSONValue; call: (name: string, args: JSONValue) => Promise<JSONValue>; signal: AbortSignal }) => Promise<JSONValue>;
export interface Capsule { schemaVersion: 1; workflowId: string; input: JSONValue; events: { name: string; args: JSONValue; outcome: Outcome }[]; outcome: Outcome }
export interface Candidate { eventIndex: number; key: string }
export type Ranker = (candidates: Candidate[], capsule: Capsule, options: { signal: AbortSignal }) => Promise<Candidate[]>;
export class ReplayMismatch extends Error { constructor(message: string) }
export function record(run: Workflow, input: JSONValue, tools: Record<string, Tool>, options?: Deadline & { workflowId?: string; maxEvents?: number }): Promise<Capsule>;
export function validateCapsule(capsule: unknown): Capsule;
export function replay(run: Workflow, capsule: Capsule, options?: Deadline & { workflowId?: string }): Promise<{ reproduced: boolean; outcome: Outcome; consumedEvents: number }>;
export function reductionCandidates(capsule: Capsule): Candidate[];
export function minimize(run: Workflow, capsule: Capsule, options?: Deadline & { ranker?: Ranker; maxAttempts?: number }): Promise<{ capsule: Capsule; attempts: number; removed: Candidate[]; exhausted: boolean; guarantee: 'same_recorded_failure_with_strict_tool_trace' }>;
