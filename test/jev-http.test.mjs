// Purpose: Exercise the real HTTP adapter against a loopback fixture, without claiming live Jev inference.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createJevProvider } from '@gbesse/decisionpacks';
import { createJevRanker } from '../src/jev.mjs';
const invoke = async provider => await createJevRanker({ provider })([{ eventIndex: 0, key: 'noise' }], { outcome: { error: { message: 'synthetic failure' } }, events: [] });
async function server(handler, run) {
  const service = createServer(handler); service.requestTimeout = 1000; service.headersTimeout = 1000;
  await new Promise(resolve => service.listen(0, '127.0.0.1', resolve));
  try { await run(`http://127.0.0.1:${service.address().port}/decision`); }
  finally { service.closeAllConnections(); await new Promise(resolve => service.close(resolve)); }
}
test('Jev integration serializes the pinned request and accepts contract-valid replies', async () => {
  let observed;
  await server(async (request, response) => {
    let raw = ''; for await (const chunk of request) raw += chunk;
    observed = { payload: JSON.parse(raw), authorization: request.headers.authorization };
    const answers = Object.fromEntries(Object.entries(observed.payload.questions).map(([id, q]) => {
      if (q.type === 'noul') return [id, { type: 'noul', noul: .9 }];
      const options = Object.keys(q.criteria); return [id, { type: 'choice', choice: options[0], confidence: 1, probabilities: Object.fromEntries(options.map((key, index) => [key, index ? 0 : 1])) }];
    }));
    response.setHeader('content-type', 'application/json'); response.end(JSON.stringify({ model: observed.payload.model, answers }));
  }, async endpoint => { await invoke(createJevProvider({ apiKey: 'synthetic-test-key', endpoint, timeoutMs: 1000 })); });
  assert.equal(observed.payload.model, 'jev-1.13.0'); assert.equal(observed.authorization, 'Bearer synthetic-test-key');
});
test('HTTP errors propagate without a fabricated decision', async () => {
  await server((_, response) => { response.writeHead(503); response.end('unavailable'); }, async endpoint => {
    await assert.rejects(invoke(createJevProvider({ apiKey: 'fixture', endpoint, timeoutMs: 1000 })), /HTTP 503/);
  });
});
test('stalled response body times out', async () => {
  await server((_, response) => { response.writeHead(200, { 'content-type': 'application/json' }); response.write('{'); }, async endpoint => {
    await assert.rejects(invoke(createJevProvider({ apiKey: 'fixture', endpoint, timeoutMs: 30 })), /abort|timeout/i);
  });
});
