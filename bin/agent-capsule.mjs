#!/usr/bin/env node
// Purpose: Record and replay explicitly trusted workflow modules; capsules never execute embedded source.
import { fingerprint } from '@gbesse/decisionpacks';
import { record, replay, minimize } from '../src/index.mjs';
import { readJSON, readText, writeJSON, loadPlugin, assertNewOutput } from '../src/cli-files.mjs';
async function main() {
  const [command, workflow, input, output, flag, ...rest] = process.argv.slice(2);
  if (!command || command === '--help') { console.log('agent-capsule record WORKFLOW.mjs INPUT.json OUTPUT.json\nagent-capsule replay WORKFLOW.mjs CAPSULE.json\nagent-capsule minimize WORKFLOW.mjs CAPSULE.json OUTPUT.json [--jev]\nWorkflow modules are trusted code. Capsules may contain sensitive inputs and outputs.'); return; }
  if (!workflow || !input || rest.length || !['record','replay','minimize'].includes(command) || (command === 'replay' && output) || (command !== 'replay' && !output) || (flag && !(command === 'minimize' && flag === '--jev'))) throw new Error('Invalid arguments');
  if (output) await assertNewOutput(output);
  const workflowId = fingerprint(await readText(workflow)), module = await loadPlugin(workflow);
  if (typeof module.run !== 'function') throw new Error('Workflow must export run');
  if (command === 'record') { const result = await record(module.run, await readJSON(input), module.tools ?? {}, { workflowId }); await writeJSON(output, result); console.log(result.outcome.status); return; }
  const capsule = await readJSON(input);
  if (capsule.workflowId !== workflowId) throw new Error('Workflow source hash changed');
  if (command === 'replay') { const result = await replay(module.run, capsule, { workflowId }); console.log(JSON.stringify(result, null, 2)); if (!result.reproduced) process.exitCode = 2; return; }
  const ranker = flag ? (await import('../src/jev.mjs')).createJevRanker() : undefined;
  const result = await minimize(module.run, capsule, { ranker }); await writeJSON(output, result.capsule); console.log(JSON.stringify({ attempts: result.attempts, removed: result.removed }, null, 2));
}
main().catch(error => { console.error(`agent-capsule: ${error.message}`); process.exitCode = 1; });
