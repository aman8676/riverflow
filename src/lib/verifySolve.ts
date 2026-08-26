import {
  CodeforcesApiError,
  findAcceptedSubmission as findCodeforcesSubmission,
  getProblemLimits,
} from "@/lib/codeforces";
import {
  LeetCodeApiError,
  findAcceptedSubmission as findLeetCodeSubmission,
} from "@/lib/leetcode";
import { Platform } from "@/lib/handles";
import { SubmissionMetrics } from "@/lib/scoring";

/**
 * Server-side only: this reaches out to Codeforces and LeetCode, and is the
 * single place that decides whether a user really solved a problem. Nothing the
 * browser sends is trusted here — the caller supplies the handle from the user's
 * stored prefs and the problem from our own daily-problem row.
 */

export interface VerifiedSubmission {
  verified: true;
  /** The platform's own submission id, stored so an award can be audited. */
  submissionId: string;
  /** When the platform accepted it, unix seconds. */
  solvedAt: number;
  language: string | null;
  metrics: SubmissionMetrics;
}

export interface UnverifiedSubmission {
  verified: false;
}

export type VerificationResult = VerifiedSubmission | UnverifiedSubmission;

const UNVERIFIED: UnverifiedSubmission = { verified: false };

/** True when the failure was the platform's, not the user's. */
export function isPlatformOutage(error: unknown): boolean {
  return error instanceof CodeforcesApiError || error instanceof LeetCodeApiError;
}

export interface VerifySolveParams {
  source: Platform;
  /** Codeforces: "1996C". LeetCode: the title slug. */
  problemId: string;
  /** The problem's page, used to scrape limits when the row predates them. */
  url: string;
  /** The caller's verified handle for `source`. */
  handle: string;
  /** Accepted submissions older than this (unix seconds) don't count. */
  notBefore: number;
  timeLimitMs?: number | null;
  memoryLimitKb?: number | null;
}

async function verifyCodeforces(
  params: VerifySolveParams,
): Promise<VerificationResult> {
  const submission = await findCodeforcesSubmission(
    params.handle,
    params.problemId,
    params.notBefore,
  );

  if (!submission) return UNVERIFIED;

  // Limits are normally stamped on the row when the problem is fetched. Rows
  // written before that, or by a fetch whose scrape failed, fall back to reading
  // the problem page now — `getProblemLimits` never throws, it defaults.
  const limits =
    params.timeLimitMs && params.memoryLimitKb
      ? { timeLimitMs: params.timeLimitMs, memoryLimitKb: params.memoryLimitKb }
      : await getProblemLimits(params.url);

  return {
    verified: true,
    submissionId: String(submission.id),
    solvedAt: submission.creationTimeSeconds,
    language: submission.programmingLanguage ?? null,
    metrics: {
      runtimeMs: submission.timeConsumedMillis,
      memoryKb: Math.round(submission.memoryConsumedBytes / 1024),
      timeLimitMs: limits.timeLimitMs,
      memoryLimitKb: limits.memoryLimitKb,
    },
  };
}

async function verifyLeetCode(
  params: VerifySolveParams,
): Promise<VerificationResult> {
  const submission = await findLeetCodeSubmission(
    params.handle,
    params.problemId,
    params.notBefore,
  );

  if (!submission) return UNVERIFIED;

  return {
    verified: true,
    submissionId: submission.id,
    solvedAt: submission.timestamp,
    language: null,
    metrics: {
      runtimeMs: submission.runtimeMs,
      memoryKb: submission.memoryKb,
      runtimePercentile: submission.runtimePercentile,
      memoryPercentile: submission.memoryPercentile,
    },
  };
}

/**
 * Asks the platform whether this user has an accepted submission for this
 * problem inside the allowed window, and brings back what it measured.
 *
 * Throws when the platform can't be reached — the caller must surface that as a
 * "try again" rather than as "you haven't solved it".
 */
export function verifySolve(
  params: VerifySolveParams,
): Promise<VerificationResult> {
  return params.source === "codeforces"
    ? verifyCodeforces(params)
    : verifyLeetCode(params);
}
