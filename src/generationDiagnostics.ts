// Bump when generation rules/algorithms change, independently of save format.
export const GENERATION_ALGORITHM_VERSION = 'regions-2026-10-04.1';
export const MAX_REGION_ATTEMPTS = 30;

export type GenerationOutcome = 'generated' | 'tract-created' | 'attempts-exhausted' | 'programming-error';
export type GenerationEvent = {
  kind: GenerationOutcome;
  action: 'add' | 'regenerate';
  anchorHex: { q: number; r: number };
  options: Record<string, unknown>;
  attempt: number;
  stage: string;
  reason: string;
  result: 'region' | 'tract' | 'rolled-back';
  rejectionCounts: Record<string, number>;
  targetSize: number | null;
  message?: string;
  stack?: string;
};

// No global console interception. Profiling remains completely independent.
export function createGenerationLogger(search = '', sink: Pick<Console, 'log' | 'warn' | 'error'> = console) {
  const detailed = new URLSearchParams(search).get('generationDebug') === '1';
  let warningCounts: Record<string, number> = {};
  return {
    begin() { warningCounts = {}; },
    detail(...args: unknown[]) { if (detailed) sink.log(...args); },
    warning(message: string, ...args: unknown[]) {
      warningCounts[message] = (warningCounts[message] ?? 0) + 1;
      if (detailed) sink.warn(message, ...args);
    },
    finish(event: GenerationEvent) {
      // Detached values: later retries/React renders cannot rewrite the diagnostic.
      const record = structuredClone({
        ...event, algorithmVersion: GENERATION_ALGORITHM_VERSION,
        maxAttempts: MAX_REGION_ATTEMPTS, warningCounts,
        // Replace with the common RNG snapshot when that generator is introduced.
        random: { source: 'Math.random', state: null }
      });
      warningCounts = {};
      if (event.kind === 'programming-error') sink.error('[generation]', record);
      else if (event.kind !== 'generated' || Object.keys(record.warningCounts).length > 0 || Object.keys(event.rejectionCounts).length > 0) sink.warn('[generation]', record);
      else if (detailed) sink.log('[generation]', record);
      return record;
    }
  };
}
