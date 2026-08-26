/**
 * Streaks, derived from the days a user actually solved something.
 *
 * A streak stored as a counter and only touched when a solve is recorded goes
 * stale the moment someone stops solving: miss three days and the dashboard
 * still shows the number it reached before the break, because nothing ran to
 * knock it down. Deriving both numbers from the solve history instead means
 * there is one source of truth and no way for the display to drift from it.
 */

import { isoDateOffset, parseISODate } from "@/lib/date";

export interface Streaks {
  /** Consecutive days up to now. Zero once a day has been missed. */
  streak: number;
  /** The longest run of consecutive days the user has ever put together. */
  bestStreak: number;
  /** The most recent day with a solve, or `null` if there has never been one. */
  lastSolvedDate: string | null;
}

export const NO_STREAKS: Streaks = {
  streak: 0,
  bestStreak: 0,
  lastSolvedDate: null,
};

/** Whether `later` is the calendar day right after `earlier`. */
function isNextDay(earlier: string, later: string): boolean {
  return isoDateOffset(1, parseISODate(earlier)) === later;
}

/**
 * Current and best streak from the dates a user solved on.
 *
 * `dates` may contain duplicates and arrive in any order — several solves on one
 * day are still one day of the streak.
 *
 * A run stays alive while the last solve was today OR yesterday. Yesterday
 * counts because today is not over yet: a streak should break when a day has
 * been missed, not the moment the clock rolls past midnight. Anything older is
 * a missed day, and the current streak is zero.
 *
 * The best streak is the longest consecutive run anywhere in the history, so it
 * survives every later break — that is the record the user set.
 */
export function deriveStreaks(dates: Iterable<string>, today: string): Streaks {
  // ISO dates sort chronologically as plain strings, so no parsing is needed
  // to put them in order.
  const days = Array.from(new Set(dates))
    .filter((date) => typeof date === "string" && date.length > 0)
    .sort();

  if (days.length === 0) return NO_STREAKS;

  let bestStreak = 1;
  // The run ending at the newest day, which is the only one that can still be
  // running now.
  let currentRun = 1;

  for (let i = 1; i < days.length; i++) {
    currentRun = isNextDay(days[i - 1], days[i]) ? currentRun + 1 : 1;

    if (currentRun > bestStreak) bestStreak = currentRun;
  }

  const lastSolvedDate = days[days.length - 1];

  const live =
    lastSolvedDate === today ||
    lastSolvedDate === isoDateOffset(-1, parseISODate(today));

  return { streak: live ? currentRun : 0, bestStreak, lastSolvedDate };
}
