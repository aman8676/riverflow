import { Query } from "node-appwrite";

import { databases, users } from "@/models/server/config";
import { db, solvedProblemCollection } from "@/models/name";
import { mergePrefs } from "@/models/server/prefs";
import { todayISODate } from "@/lib/date";
import { deriveStreaks, Streaks } from "@/lib/streak";
import { UserPrefs } from "@/store/auth";

/** Appwrite's per-request ceiling. */
const PAGE_SIZE = 100;

/**
 * Enough pages for ~14 years of daily solving. The cap exists so a corrupted
 * cursor can never turn this into an unbounded loop, not because anyone is
 * expected to reach it.
 */
const MAX_PAGES = 50;

/**
 * Every date this user has recorded a solve on, duplicates included.
 *
 * Only `dateSolved` is selected — the whole history is read on every recompute,
 * and the rest of the row (submission ids, runtimes, points) is dead weight
 * here. `$id` comes along because it is the pagination cursor.
 */
async function solvedDates(userId: string): Promise<string[]> {
  const dates: string[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < MAX_PAGES; page++) {
    const queries = [
      Query.equal("userId", userId),
      Query.select(["$id", "dateSolved"]),
      Query.orderAsc("$createdAt"),
      Query.limit(PAGE_SIZE),
    ];

    if (cursor) queries.push(Query.cursorAfter(cursor));

    const rows = await databases.listDocuments(
      db,
      solvedProblemCollection,
      queries,
    );

    for (const row of rows.documents) {
      dates.push(String((row as unknown as { dateSolved: string }).dateSolved));
    }

    if (rows.documents.length < PAGE_SIZE) break;

    cursor = rows.documents[rows.documents.length - 1].$id;
  }

  return dates;
}

/**
 * Recomputes both streaks from the solve history.
 *
 * This is the authoritative answer. The values on the user's prefs are a cache
 * of it, kept so other surfaces can read a streak without this scan.
 */
export async function recomputeStreaks(
  userId: string,
  today: string = todayISODate(),
): Promise<Streaks> {
  return deriveStreaks(await solvedDates(userId), today);
}

export interface SolveTotals {
  points: number;
  streak: number;
  bestStreak: number;
}

/**
 * The user's totals, with the cached streaks repaired if they have drifted.
 *
 * Drift is normal rather than exceptional: the cached streak is only ever
 * written when a solve is recorded, so it keeps showing the old number for as
 * long as someone stays away. Reading the totals is exactly when that needs to
 * be corrected, so the write happens here.
 */
export async function syncedTotals(
  userId: string,
  today: string = todayISODate(),
): Promise<SolveTotals> {
  const [prefs, derived] = await Promise.all([
    users.getPrefs<UserPrefs>(userId),
    recomputeStreaks(userId, today),
  ]);

  const points = Number(prefs.points) || 0;
  const totals: SolveTotals = {
    points,
    streak: derived.streak,
    // The stored record is never lowered: a user who solved before this became
    // derived has a best streak in prefs that the history may not reach back
    // far enough to reproduce.
    bestStreak: Math.max(Number(prefs.bestStreak) || 0, derived.bestStreak),
  };

  const drifted =
    (Number(prefs.streak) || 0) !== totals.streak ||
    (Number(prefs.bestStreak) || 0) !== totals.bestStreak;

  if (drifted) {
    await mergePrefs(userId, {
      streak: totals.streak,
      bestStreak: totals.bestStreak,
    });
  }

  return totals;
}
