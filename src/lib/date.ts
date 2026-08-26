/**
 * Local calendar date as `YYYY-MM-DD`.
 *
 * Deliberately not `toISOString()`, which yields the UTC date — for a user in
 * UTC+5:30 that is still "yesterday" until 05:30 local time. Both the
 * `fetch-daily` script and the solve API route use this so a problem published
 * for a given day and a solve recorded that same day agree on the date key.
 */
export function todayISODate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Local calendar date `days` away from `from`, as `YYYY-MM-DD`.
 * Negative values go backwards. Constructing a Date with an out-of-range day
 * lets the runtime normalise month/year boundaries (and avoids the DST error
 * you get from subtracting 24h of milliseconds).
 */
export function isoDateOffset(days: number, from: Date = new Date()): string {
  const shifted = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate() + days,
  );
  const year = shifted.getFullYear();
  const month = String(shifted.getMonth() + 1).padStart(2, "0");
  const day = String(shifted.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Local calendar date for yesterday, as `YYYY-MM-DD`. */
export function yesterdayISODate(): string {
  return isoDateOffset(-1);
}

/**
 * Midnight local time on `isoDate` (`YYYY-MM-DD`), as unix SECONDS.
 *
 * Both platforms timestamp submissions in unix seconds, so this is what turns
 * "the solve must have happened today" into a comparison the verifiers can make.
 * Parsing the parts by hand rather than `new Date(isoDate)` is deliberate: the
 * latter parses a bare date as UTC midnight, which is the previous day locally
 * for anyone east of Greenwich.
 */
export function startOfDayUnixSeconds(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);

  return Math.floor(new Date(year, month - 1, day).getTime() / 1000);
}

/**
 * Parses `YYYY-MM-DD` into a local-midnight `Date`.
 *
 * `new Date(isoDate)` would parse it as UTC midnight, which is the previous day
 * for anyone east of Greenwich — the same trap `startOfDayUnixSeconds` avoids.
 */
export function parseISODate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);

  return new Date(year, month - 1, day);
}
