/**
 * Tests for the continuous traffic estimation model.
 *
 * Validates:
 *  a) Monotonicity: lower currentSpeed (fixed freeFlow) → higher multiplier → higher impressions
 *  b) Continuity: small speed changes → small impression changes
 *  c) Uniqueness: 12+ distinct inputs produce at least 10 distinct outputs
 */

// We import the pure function directly (it's exported from index.ts)
import { estimateDailyImpressions } from "./index.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

// --- Helper ---
function impressions(cur: number, ff: number, conf = 0.8): number {
  return estimateDailyImpressions(cur, ff, conf).estimated_daily_traffic;
}

// --- Test cases: 12 distinct (currentSpeed, freeFlowSpeed) pairs ---
const testCases: { cur: number; ff: number; label: string }[] = [
  { cur: 10, ff: 120, label: "highway heavy congestion" },
  { cur: 40, ff: 120, label: "highway moderate congestion" },
  { cur: 80, ff: 120, label: "highway light congestion" },
  { cur: 115, ff: 120, label: "highway free flow" },
  { cur: 15, ff: 60, label: "avenue heavy congestion" },
  { cur: 30, ff: 60, label: "avenue moderate" },
  { cur: 55, ff: 60, label: "avenue free flow" },
  { cur: 8, ff: 35, label: "urban heavy congestion" },
  { cur: 20, ff: 35, label: "urban moderate" },
  { cur: 33, ff: 35, label: "urban free flow" },
  { cur: 5, ff: 15, label: "slow zone heavy" },
  { cur: 14, ff: 15, label: "slow zone free flow" },
];

Deno.test("Monotonicity: lower currentSpeed → higher impressions (fixed freeFlow)", () => {
  // Group by freeFlowSpeed
  const groups: Record<number, typeof testCases> = {};
  for (const tc of testCases) {
    if (!groups[tc.ff]) groups[tc.ff] = [];
    groups[tc.ff].push(tc);
  }

  for (const [ff, cases] of Object.entries(groups)) {
    // Sort by currentSpeed ascending
    const sorted = [...cases].sort((a, b) => a.cur - b.cur);
    for (let i = 0; i < sorted.length - 1; i++) {
      const impLow = impressions(sorted[i].cur, sorted[i].ff);
      const impHigh = impressions(sorted[i + 1].cur, sorted[i + 1].ff);
      assert(
        impLow >= impHigh,
        `ff=${ff}: cur=${sorted[i].cur} (${impLow}) should >= cur=${sorted[i + 1].cur} (${impHigh})`
      );
    }
  }
});

Deno.test("Continuity: small speed change → small impression change (<15%)", () => {
  const base = impressions(50, 80);
  const nudged = impressions(52, 80);
  const pctChange = Math.abs(nudged - base) / base;
  assert(
    pctChange < 0.15,
    `Change of 2 km/h produced ${(pctChange * 100).toFixed(1)}% change (base=${base}, nudged=${nudged})`
  );

  const base2 = impressions(30, 60);
  const nudged2 = impressions(31, 60);
  const pct2 = Math.abs(nudged2 - base2) / base2;
  assert(
    pct2 < 0.15,
    `Change of 1 km/h produced ${(pct2 * 100).toFixed(1)}% change (base=${base2}, nudged=${nudged2})`
  );
});

Deno.test("Uniqueness: 12 inputs produce at least 10 distinct outputs", () => {
  const values = testCases.map(tc => impressions(tc.cur, tc.ff));
  const unique = new Set(values);
  console.log("All outputs:", values);
  console.log("Unique count:", unique.size);
  assert(
    unique.size >= 10,
    `Expected ≥10 unique values, got ${unique.size}: ${[...unique].join(', ')}`
  );
});

Deno.test("Boundary: freeFlowSpeed=0 does not crash", () => {
  const result = estimateDailyImpressions(10, 0, 0.5);
  assert(result.estimated_daily_traffic >= 0, "Should be >= 0");
});

Deno.test("Boundary: very high speeds", () => {
  const result = estimateDailyImpressions(150, 150, 0.9);
  assert(result.estimated_daily_traffic > 0, "Should be positive");
});

Deno.test("Boundary: zero confidence floors to 0.4", () => {
  const withZero = impressions(50, 80, 0);
  const withLow = impressions(50, 80, 0.4);
  assertEquals(withZero, withLow, "Zero confidence should floor to 0.4");
});

Deno.test("Output examples: 5 locations with distinct ratios", () => {
  const examples = [
    { cur: 12, ff: 110, conf: 0.85, desc: "Autopista CDMX congestionada" },
    { cur: 65, ff: 90, conf: 0.9, desc: "Av. principal Monterrey fluida" },
    { cur: 25, ff: 55, conf: 0.7, desc: "Calle secundaria Guadalajara" },
    { cur: 8, ff: 30, conf: 0.6, desc: "Zona urbana Mérida" },
    { cur: 40, ff: 40, conf: 0.8, desc: "Calle libre Cancún" },
  ];

  console.log("\n--- Example outputs ---");
  for (const ex of examples) {
    const r = estimateDailyImpressions(ex.cur, ex.ff, ex.conf);
    const ratio = (ex.cur / Math.max(ex.ff, 1)).toFixed(3);
    console.log(`${ex.desc}: ratio=${ratio}, impressions=${r.estimated_daily_traffic}, road=${r.road_type}, conf=${r.confidence_level}`);
  }
});
