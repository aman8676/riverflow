/**
 * How a verified submission turns into practice points.
 *
 * Points = base points for the problem's difficulty x an efficiency multiplier
 * derived from what the judge actually measured for the accepted submission.
 *
 * Runtime and memory are proxies for time/space complexity, not proofs of it: a
 * tight O(n log n) in a slow language can lose to a sloppy O(n^2) in C++. They
 * are, however, the only per-submission signal either platform exposes, and on
 * inputs sized to separate the intended complexity from the naive one they
 * track it closely enough to rank solutions.
 */

export type EfficiencyTier =
  | "optimal"
  | "efficient"
  | "acceptable"
  | "slow"
  | "unknown";

/** Base award before the efficiency multiplier. */
const BASE_POINTS_BY_DIFFICULTY: Record<string, number> = {
  easy: 10,
  medium: 30,
  hard: 100,
};

/**
 * Runtime counts for more than memory: most problems are decided by the time
 * limit, and memory usage is dominated by the input itself on many of them.
 */
const TIME_WEIGHT = 0.6;
const MEMORY_WEIGHT = 0.4;

/** Score thresholds, highest first. `min` is inclusive. */
const TIERS: { min: number; tier: EfficiencyTier; multiplier: number }[] = [
  { min: 0.85, tier: "optimal", multiplier: 1.5 },
  { min: 0.65, tier: "efficient", multiplier: 1.25 },
  { min: 0.4, tier: "acceptable", multiplier: 1.0 },
  { min: 0, tier: "slow", multiplier: 0.75 },
];

export const TIER_LABELS: Record<EfficiencyTier, string> = {
  optimal: "Optimal",
  efficient: "Efficient",
  acceptable: "Acceptable",
  slow: "Brute force",
  unknown: "Verified",
};

/**
 * What a platform reported about one accepted submission.
 *
 * Two shapes are supported because the platforms measure differently:
 *
 *  - Codeforces reports absolute usage plus the problem's limits, so efficiency
 *    is how much of the budget was left unused.
 *  - LeetCode reports a percentile against every other accepted submission, so
 *    the percentile IS the efficiency.
 *
 * Percentiles win when both are present: being ranked against real solutions to
 * the same problem is a better signal than a fraction of a generous limit.
 */
export interface SubmissionMetrics {
  runtimeMs?: number | null;
  memoryKb?: number | null;
  timeLimitMs?: number | null;
  memoryLimitKb?: number | null;
  /** 0-100, higher is faster than more submissions. */
  runtimePercentile?: number | null;
  /** 0-100, higher is leaner than more submissions. */
  memoryPercentile?: number | null;
}

export interface Efficiency {
  /** 0-1, higher is better. `null` when the platform reported nothing usable. */
  score: number | null;
  tier: EfficiencyTier;
  multiplier: number;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function isUsableNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * Combines the time and space dimensions into one 0-1 score.
 *
 * When only one dimension is known it carries the whole score rather than being
 * diluted by a missing half — a submission with runtime data but no memory data
 * would otherwise be capped at 0.6 and never reach the top tier.
 */
function combine(
  timeScore: number | null,
  memoryScore: number | null,
): number | null {
  if (timeScore === null && memoryScore === null) return null;
  if (timeScore === null) return memoryScore;
  if (memoryScore === null) return timeScore;

  return timeScore * TIME_WEIGHT + memoryScore * MEMORY_WEIGHT;
}

/** Fraction of the budget left unused, e.g. 300ms of a 2000ms limit -> 0.85. */
function headroom(used: number, limit: number | null | undefined): number | null {
  if (!isUsableNumber(limit) || limit <= 0) return null;
  return clamp01(1 - used / limit);
}

export function rateEfficiency(metrics: SubmissionMetrics): Efficiency {
  const timeScore = isUsableNumber(metrics.runtimePercentile)
    ? clamp01(metrics.runtimePercentile / 100)
    : isUsableNumber(metrics.runtimeMs)
      ? headroom(metrics.runtimeMs, metrics.timeLimitMs)
      : null;

  const memoryScore = isUsableNumber(metrics.memoryPercentile)
    ? clamp01(metrics.memoryPercentile / 100)
    : isUsableNumber(metrics.memoryKb)
      ? headroom(metrics.memoryKb, metrics.memoryLimitKb)
      : null;

  const score = combine(timeScore, memoryScore);

  if (score === null) {
    // Accepted, but the platform told us nothing about how it ran. Award the
    // base points untouched rather than guessing a penalty.
    return { score: null, tier: "unknown", multiplier: 1 };
  }

  const match = TIERS.find((tier) => score >= tier.min) ?? TIERS[TIERS.length - 1];

  return { score, tier: match.tier, multiplier: match.multiplier };
}

export function basePointsFor(difficulty: string): number {
  return BASE_POINTS_BY_DIFFICULTY[difficulty?.toLowerCase()] ?? 0;
}

export interface Award {
  basePoints: number;
  points: number;
  efficiency: Efficiency;
}

/**
 * Final award for an accepted submission.
 *
 * `difficulty` is whatever the problem row stores — Codeforces rows hold our own
 * tier label ("easy"), LeetCode rows hold LeetCode's casing ("Easy") — so the
 * lookup is case-insensitive.
 */
export function awardFor(
  difficulty: string,
  metrics: SubmissionMetrics,
): Award {
  const basePoints = basePointsFor(difficulty);
  const efficiency = rateEfficiency(metrics);

  return {
    basePoints,
    points: Math.round(basePoints * efficiency.multiplier),
    efficiency,
  };
}
