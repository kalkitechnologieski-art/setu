// lib/ab-testing/engine.ts
// Two-proportion z-test for winner selection.

export interface Variant {
  id: string;
  label: string;
  sends: number;
  conversions: number;
}

export interface WinnerResult {
  winner: string | null;
  confidence: number;
  significant: boolean;
}

/**
 * Two-proportion z-test. Returns winner if p < 0.05 and minimum sample met.
 * Minimum 100 sends per variant required.
 */
export function determineWinner(
  variants: Variant[],
  minSendsPerVariant = 100
): WinnerResult {
  if (variants.length < 2) return { winner: null, confidence: 0, significant: false };
  if (variants.some((v) => v.sends < minSendsPerVariant)) {
    return { winner: null, confidence: 0, significant: false };
  }

  const sorted = [...variants].sort(
    (a, b) => b.conversions / b.sends - a.conversions / a.sends
  );
  const top = sorted[0]!;
  const second = sorted[1]!;

  const p1 = top.conversions / top.sends;
  const p2 = second.conversions / second.sends;
  const pPool = (top.conversions + second.conversions) / (top.sends + second.sends);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / top.sends + 1 / second.sends));
  if (se === 0) return { winner: null, confidence: 0, significant: false };

  const z = (p1 - p2) / se;
  const confidence = Math.min(0.9999, 1 - 2 * (1 - normalCdf(Math.abs(z))));

  return {
    winner: confidence >= 0.95 ? top.id : null,
    confidence,
    significant: confidence >= 0.95,
  };
}

// Abramowitz & Stegun approximation
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * z);
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return 1 - p;
}
