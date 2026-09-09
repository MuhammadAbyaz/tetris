export const INPUT_LATENCY_BUDGET_MS = 16;

export function applyInputWithPaint<T>(options: {
  inputAtMs: number;
  apply: () => T;
  paint: () => void;
  now: () => number;
}): { result: T; latencyMs: number; withinBudget: boolean } {
  const result = options.apply();
  options.paint();
  const latencyMs = Math.max(0, options.now() - options.inputAtMs);
  return {
    result,
    latencyMs,
    withinBudget: latencyMs < INPUT_LATENCY_BUDGET_MS,
  };
}
