/**
 * Turns (tier, topic) into the actual list of problems a user practises from.
 *
 * Kept out of the API route so the selection rules stay testable and the route
 * is left doing nothing but parsing input and shaping a response.
 */

import { getTopProblemsByTag } from "@/lib/codeforces";
import { getTopProblemsByTopic } from "@/lib/leetcode";
import type { Platform } from "@/lib/handles";
import { DsaTopic, SHEET_SIZE, Tier } from "@/lib/sheet";

export interface SheetProblem {
  platform: Platform;
  /** Stable id on its platform: "1996C" on Codeforces, the slug on LeetCode. */
  problemId: string;
  title: string;
  url: string;
  /** Codeforces rating as a string, or LeetCode's Easy/Medium/Hard. */
  difficulty: string;
  /** Codeforces only - the numeric rating, used to order the sheet. */
  rating?: number;
  /** Codeforces only - how many people have solved it. */
  solvedCount?: number;
  /** LeetCode only - acceptance rate as a percentage. */
  acRate?: number;
  tags: string[];
}

/** Where a difficulty label sits when ordering a sheet from easiest up. */
const LEETCODE_DIFFICULTY_ORDER: Record<string, number> = {
  Easy: 0,
  Medium: 1,
  Hard: 2,
};

/**
 * Interleaves two ordered lists, alternating between them and finishing with
 * whatever the longer one has left.
 *
 * The alternation matters: a sheet that is ten Codeforces problems followed by
 * ten LeetCode ones gets abandoned halfway, at the platform switch.
 */
function interleave<T>(a: T[], b: T[], total: number): T[] {
  const merged: T[] = [];

  for (let i = 0; merged.length < total && (i < a.length || i < b.length); i++) {
    if (i < a.length) merged.push(a[i]);
    if (merged.length < total && i < b.length) merged.push(b[i]);
  }

  return merged.slice(0, total);
}

export interface Sheet {
  problems: SheetProblem[];
  /** Which platforms actually answered - the UI says so when one didn't. */
  sources: { codeforces: boolean; leetcode: boolean };
}

/**
 * Builds a sheet of at most `size` problems for a tier and topic.
 *
 * Half from each platform, then topped up from whichever side has more when the
 * other comes up short. Each half is *selected* by popularity and then *ordered*
 * by difficulty, so the list ramps up rather than starting at its hardest.
 *
 * A platform that fails is not fatal: a Codeforces outage should still leave you
 * with ten LeetCode problems, not an error page.
 */
export async function buildSheet(
  tier: Tier,
  topic: DsaTopic,
  size: number = SHEET_SIZE,
): Promise<Sheet> {
  const half = Math.ceil(size / 2);

  // Over-fetch each side so a short answer from one can be covered by the other.
  const [codeforcesResult, leetcodeResult] = await Promise.allSettled([
    getTopProblemsByTag({
      tags: topic.codeforcesTags,
      minRating: tier.codeforces.minRating,
      maxRating: tier.codeforces.maxRating,
      limit: size,
    }),
    getTopProblemsByTopic({
      topicSlugs: topic.leetcodeSlugs,
      difficulties: tier.leetcode,
      limit: size,
    }),
  ]);

  const codeforcesProblems: SheetProblem[] = (
    codeforcesResult.status === "fulfilled" ? codeforcesResult.value : []
  ).map((problem) => ({
    platform: "codeforces" as const,
    problemId: problem.problemId,
    title: problem.name,
    url: problem.url,
    difficulty: String(problem.rating),
    rating: problem.rating,
    solvedCount: problem.solvedCount,
    tags: problem.tags,
  }));

  const leetcodeProblems: SheetProblem[] = (
    leetcodeResult.status === "fulfilled" ? leetcodeResult.value : []
  ).map((problem) => ({
    platform: "leetcode" as const,
    problemId: problem.titleSlug,
    title: problem.title,
    url: problem.url,
    difficulty: problem.difficulty,
    acRate: problem.acRate,
    tags: problem.tags,
  }));

  // Take each platform's share, then order that share from easiest up.
  const codeforcesShare = codeforcesProblems
    .slice(0, Math.max(half, size - leetcodeProblems.length))
    .sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));

  const leetcodeShare = leetcodeProblems
    .slice(0, Math.max(half, size - codeforcesProblems.length))
    .sort(
      (a, b) =>
        (LEETCODE_DIFFICULTY_ORDER[a.difficulty] ?? 0) -
        (LEETCODE_DIFFICULTY_ORDER[b.difficulty] ?? 0),
    );

  return {
    problems: interleave(codeforcesShare, leetcodeShare, size),
    sources: {
      codeforces: codeforcesResult.status === "fulfilled",
      leetcode: leetcodeResult.status === "fulfilled",
    },
  };
}
