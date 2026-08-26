/**
 * Publishing a fresh set of daily problems.
 *
 * Shared by the `fetch-daily` script and the cron route so both produce exactly
 * the same set for a given day, whichever one happens to run first.
 */

import { ID, Query } from "node-appwrite";

import { databases } from "@/models/server/config";
import { db, dailyProblemCollection } from "@/models/name";
import {
  getRandomProblemByDifficulty,
  getProblemLimits,
  type Difficulty,
} from "@/lib/codeforces";
import { getDailyLeetCodeProblem } from "@/lib/leetcode";
import { isoDateOffset, todayISODate } from "@/lib/date";

export interface DailyProblemDocument {
  source: "codeforces" | "leetcode";
  problemId: string;
  title: string;
  url: string;
  difficulty: string;
  tags: string[];
  date: string;
  /** Judge limits, used to score how efficient a submission was. */
  timeLimitMs?: number;
  memoryLimitKb?: number;
}

/**
 * Codeforces asks for at most one request every two seconds and answers 403 to
 * bursts. Each problem costs one scrape of its page for the limits, so pace them.
 */
const CODEFORCES_REQUEST_GAP_MS = 2000;

/**
 * How far back to look when avoiding repeats. Long enough that the dashboard
 * feels genuinely new every morning, short enough that the exclusion never
 * empties a rating band.
 */
const NO_REPEAT_DAYS = 45;

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A small, fast PRNG - enough to shuffle a problemset, not for anything else. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a over the date string, so "2026-08-26" always seeds the same stream. */
function seedFromDate(date: string): number {
  let hash = 0x811c9dc5;

  for (let i = 0; i < date.length; i++) {
    hash ^= date.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

/**
 * Problem ids published in the last `NO_REPEAT_DAYS` days.
 *
 * Codeforces' rating bands hold thousands of problems, so an unseeded random
 * pick would still repeat one now and then - and a repeat is the one thing that
 * makes a daily feature look broken.
 */
async function recentlyUsedProblemIds(date: string): Promise<Set<string>> {
  const since = isoDateOffset(-NO_REPEAT_DAYS, new Date(`${date}T00:00:00`));

  const rows = await databases.listDocuments(db, dailyProblemCollection, [
    Query.greaterThanEqual("date", since),
    Query.limit(500),
  ]);

  return new Set(
    rows.documents.map((document) =>
      String((document as unknown as { problemId: string }).problemId),
    ),
  );
}

/**
 * Chooses the problems for `date`.
 *
 * The random source is seeded from the date itself, so re-running a day yields
 * the same set instead of silently publishing a different one - which matters
 * because the cron and the script can both fire for the same morning.
 */
export async function selectProblemsFor(
  date: string,
): Promise<DailyProblemDocument[]> {
  const documents: DailyProblemDocument[] = [];
  const random = mulberry32(seedFromDate(date));

  let exclude: Set<string>;

  try {
    exclude = await recentlyUsedProblemIds(date);
  } catch {
    // Worst case we repeat a problem; that beats publishing nothing.
    exclude = new Set();
  }

  for (const difficulty of DIFFICULTIES) {
    try {
      const problem = await getRandomProblemByDifficulty(difficulty, {
        exclude,
        random,
      });

      if (!problem) {
        console.warn(`No Codeforces problem found for "${difficulty}", skipping`);
        continue;
      }

      // Don't let one difficulty's pick collide with another's.
      exclude.add(problem.problemId);

      // Scraped now rather than at scoring time so every verification isn't
      // one more request to Codeforces. Falls back to the usual limits.
      const limits = await getProblemLimits(problem.url);
      await sleep(CODEFORCES_REQUEST_GAP_MS);

      documents.push({
        source: "codeforces",
        problemId: problem.problemId,
        title: problem.name,
        url: problem.url,
        difficulty,
        tags: problem.tags,
        date,
        timeLimitMs: limits.timeLimitMs,
        memoryLimitKb: limits.memoryLimitKb,
      });
    } catch (error) {
      console.warn(`Failed to fetch Codeforces "${difficulty}" problem:`, error);
    }
  }

  const leetcode = await getDailyLeetCodeProblem();

  if (leetcode) {
    documents.push({
      source: "leetcode",
      // The slug is what LeetCode reports on each accepted submission, so it is
      // the id a solve is verified against.
      problemId: leetcode.titleSlug,
      title: leetcode.title,
      url: leetcode.url,
      difficulty: leetcode.difficulty,
      tags: [],
      date,
    });
  } else {
    console.warn("LeetCode daily problem unavailable, skipping");
  }

  return documents;
}

export interface EnsureResult {
  date: string;
  /** How many rows were written. Zero when the day was already published. */
  created: number;
  /** True when a set already existed and nothing was fetched. */
  alreadyPublished: boolean;
}

/**
 * Publishes the problem set for `date` unless one already exists.
 *
 * Idempotent by design: the cron, the script and a manual trigger can all run on
 * the same morning and only the first does any work.
 */
export async function ensureDailyProblems(
  date: string = todayISODate(),
): Promise<EnsureResult> {
  const existing = await databases.listDocuments(db, dailyProblemCollection, [
    Query.equal("date", date),
    Query.limit(1),
  ]);

  if (existing.total > 0) {
    return { date, created: 0, alreadyPublished: true };
  }

  const documents = await selectProblemsFor(date);

  if (documents.length === 0) {
    throw new Error(
      "No problems could be fetched from any source. Nothing inserted.",
    );
  }

  for (const document of documents) {
    await databases.createDocument(
      db,
      dailyProblemCollection,
      ID.unique(),
      document,
    );
    console.log(
      `Inserted [${document.source}] ${document.title} (${document.difficulty})`,
    );
  }

  return { date, created: documents.length, alreadyPublished: false };
}
