// Purpose: Type the optional Jev adapter and injectable provider.
import type { Provider } from '@gbesse/decisionpacks';
import type { Ranker } from './index.mjs';
export function createJevRanker(options?: { provider?: Provider; signal?: AbortSignal }): Ranker;
