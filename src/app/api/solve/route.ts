import { NextRequest, NextResponse } from "next/server";
import { ID, Query } from "node-appwrite";
import { databases, users } from "@/models/server/config";
import { db, solvedProblemCollection, dailyProblemCollection } from "@/models/name";
import { getUserFromRequest } from "@/models/server/auth";
import { mergePrefs } from "@/models/server/prefs";
import { recomputeStreaks, syncedTotals } from "@/models/server/streak";
import { ownerPermissions } from "@/models/permissions";
import { UserPrefs } from "@/store/auth";
import { todayISODate, startOfDayUnixSeconds } from "@/lib/date";
import { Platform, PLATFORM_LABELS, isPlatform } from "@/lib/handles";
import { awardFor, TIER_LABELS } from "@/lib/scoring";
import { verifySolve, isPlatformOutage } from "@/lib/verifySolve";

/** Which pref holds each platform's handle and its link timestamp. */
const PREF_KEYS = {
  codeforces: { handle: "codeforcesHandle", linkedAt: "codeforcesLinkedAt" },
  leetcode: { handle: "leetcodeHandle", linkedAt: "leetcodeLinkedAt" },
} as const;

/**
 * Applies the rewards for a solve that has just been recorded for today.
 *
 * Points accumulate; the streaks are re-derived from the solve history rather
 * than incremented, so the row written a moment ago is simply part of the
 * input. That keeps one definition of what a streak is — see `src/lib/streak.ts`
 * — instead of one here and a different one wherever it is displayed.
 */
async function applySolveRewards(
  userId: string,
  today: string,
  awardedPoints: number,
) {
  const prefs = await users.getPrefs<UserPrefs>(userId);
  const points = (Number(prefs.points) || 0) + awardedPoints;

  const derived = await recomputeStreaks(userId, today);

  // Never lower a record set before streaks became derived: the stored value
  // may reach further back than the history this can see.
  const bestStreak = Math.max(
    Number(prefs.bestStreak) || 0,
    derived.bestStreak,
  );

  await mergePrefs(userId, { points, streak: derived.streak, bestStreak });

  return { points, streak: derived.streak, bestStreak };
}

/**
 * Claims points for a problem the caller says they have solved.
 *
 * Nothing here takes the caller's word for it. The problem and its difficulty
 * come from our own daily-problem row, the identity from a verified Appwrite
 * JWT, and the solve itself from the platform's API: an accepted submission by
 * the user's linked handle, made today, after that handle was linked. Points
 * then scale with what the judge measured for that submission.
 */
export async function POST(request: NextRequest) {
  try {
    // Identity comes from the verified Appwrite JWT. A userId in the body is
    // unauthenticated input and is never read.
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to claim a solved problem" },
        { status: 401 },
      );
    }

    const { problemId, source } = await request.json();

    if (!problemId || typeof problemId !== "string") {
      return NextResponse.json(
        { error: "problemId is required" },
        { status: 400 },
      );
    }

    if (!isPlatform(source)) {
      return NextResponse.json(
        { error: "source must be one of: codeforces, leetcode" },
        { status: 400 },
      );
    }

    const platform: Platform = source;
    const userId = user.$id;
    const dateSolved = todayISODate();

    // Difficulty and the problem's URL are looked up from our own records rather
    // than taken from the request: a caller could otherwise claim "hard" on every
    // solve, or invent problem ids, and mint unlimited points.
    const known = await databases.listDocuments(db, dailyProblemCollection, [
      Query.equal("problemId", problemId),
      Query.equal("source", platform),
      Query.limit(1),
    ]);

    if (known.total === 0) {
      return NextResponse.json({ error: "Unknown problem" }, { status: 404 });
    }

    const problem = known.documents[0] as any;
    const difficulty = problem.difficulty as string;

    // Friendly pre-check. The unique index on (userId, problemId, dateSolved) is
    // what actually guarantees uniqueness if two requests race.
    const existing = await databases.listDocuments(db, solvedProblemCollection, [
      Query.equal("userId", userId),
      Query.equal("problemId", problemId),
      Query.equal("dateSolved", dateSolved),
      Query.limit(1),
    ]);

    if (existing.total > 0) {
      const previous = existing.documents[0] as any;

      return NextResponse.json(
        {
          verified: true,
          alreadySolved: true,
          solved: previous,
          awardedPoints: 0,
          efficiency: previous.efficiency ?? null,
          runtimeMs: previous.runtimeMs ?? null,
          memoryKb: previous.memoryKb ?? null,
          ...(await syncedTotals(userId, dateSolved)),
          message: "You already claimed this problem today",
        },
        { status: 200 },
      );
    }

    const prefs = await users.getPrefs<UserPrefs>(userId);
    const handle = prefs[PREF_KEYS[platform].handle] || "";
    const linkedAt = Number(prefs[PREF_KEYS[platform].linkedAt]) || 0;

    if (!handle) {
      return NextResponse.json(
        {
          needsHandle: true,
          platform,
          error: `Link your ${PLATFORM_LABELS[platform]} account before claiming points for it`,
        },
        { status: 400 },
      );
    }

    // The solve has to have happened today: the point of a daily problem is
    // solving it today, and it stops an old solve from being replayed for points.
    const startOfToday = startOfDayUnixSeconds(dateSolved);

    let verification;

    try {
      verification = await verifySolve({
        source: platform,
        problemId,
        url: problem.url,
        handle,
        notBefore: startOfToday,
        timeLimitMs: problem.timeLimitMs ?? null,
        memoryLimitKb: problem.memoryLimitKb ?? null,
      });
    } catch (error) {
      if (isPlatformOutage(error)) {
        return NextResponse.json(
          { verified: false, error: (error as Error).message },
          { status: 502 },
        );
      }
      throw error;
    }

    if (!verification.verified) {
      return NextResponse.json(
        {
          verified: false,
          message: `No accepted submission for this problem found today on ${PLATFORM_LABELS[platform]} for "${handle}". Solve it there first — verdicts can take a moment to appear.`,
        },
        { status: 200 },
      );
    }

    // Accepted, but before this handle was linked. Without this, linking a strong
    // competitor's handle would instantly bank whatever they already solved today.
    if (verification.solvedAt < linkedAt) {
      return NextResponse.json(
        {
          verified: false,
          message: `That submission was accepted before you linked "${handle}". Solves only count from the moment an account is linked.`,
        },
        { status: 200 },
      );
    }

    const award = awardFor(difficulty, verification.metrics);
    const { metrics } = verification;

    try {
      const solved = await databases.createDocument(
        db,
        solvedProblemCollection,
        ID.unique(),
        {
          userId,
          problemId,
          source: platform,
          dateSolved,
          verified: true,
          submissionId: verification.submissionId,
          points: award.points,
          efficiency: award.efficiency.tier,
          // Optional columns: omitted rather than nulled when the platform did
          // not report them (LeetCode, for anonymous callers).
          ...(typeof metrics.runtimeMs === "number"
            ? { runtimeMs: Math.round(metrics.runtimeMs) }
            : {}),
          ...(typeof metrics.memoryKb === "number"
            ? { memoryKb: Math.round(metrics.memoryKb) }
            : {}),
        },
        ownerPermissions(userId),
      );

      const totals = await applySolveRewards(userId, dateSolved, award.points);

      return NextResponse.json(
        {
          verified: true,
          alreadySolved: false,
          solved,
          difficulty,
          submissionId: verification.submissionId,
          language: verification.language,
          runtimeMs: metrics.runtimeMs ?? null,
          memoryKb: metrics.memoryKb ?? null,
          timeLimitMs: metrics.timeLimitMs ?? null,
          memoryLimitKb: metrics.memoryLimitKb ?? null,
          runtimePercentile: metrics.runtimePercentile ?? null,
          memoryPercentile: metrics.memoryPercentile ?? null,
          efficiency: award.efficiency.tier,
          efficiencyLabel: TIER_LABELS[award.efficiency.tier],
          efficiencyScore: award.efficiency.score,
          basePoints: award.basePoints,
          awardedPoints: award.points,
          ...totals,
          message: `Verified on ${PLATFORM_LABELS[platform]} (+${award.points} points)`,
        },
        { status: 201 },
      );
    } catch (error: any) {
      // Lost a race against a concurrent identical request; the unique index
      // rejected the duplicate. No points — the winning request awarded them.
      if (error?.code === 409) {
        return NextResponse.json(
          {
            verified: true,
            alreadySolved: true,
            awardedPoints: 0,
            ...(await syncedTotals(userId, dateSolved)),
            message: "You already claimed this problem today",
          },
          { status: 200 },
        );
      }
      throw error;
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error verifying your solution" },
      { status: error?.code || error?.status || 500 },
    );
  }
}
