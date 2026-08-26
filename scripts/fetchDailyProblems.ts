import { ensureDailyProblems } from "../src/lib/dailyProblems";
import { todayISODate } from "../src/lib/date";

/**
 * A real calendar date in YYYY-MM-DD form.
 *
 * The round-trip through `Date` is what rejects "2026-13-99": a shape check
 * alone would let it through and publish a day that can never be read back.
 */
function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);

  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

/**
 * Publishes today's problem set by hand.
 *
 * The same work runs automatically from `/api/cron/daily-problems`; this stays
 * for local use and for backfilling a specific day:
 *
 *   npm run fetch-daily
 *   npm run fetch-daily -- 2026-08-25
 */
async function main() {
  const requested = process.argv[2];

  if (requested && !isCalendarDate(requested)) {
    throw new Error(`Expected a real YYYY-MM-DD date, got "${requested}"`);
  }

  const date = requested || todayISODate();

  console.log(`Fetching daily problems for ${date}...`);

  const result = await ensureDailyProblems(date);

  if (result.alreadyPublished) {
    console.log(`Problems are already stored for ${date}. Nothing to do.`);
    return;
  }

  console.log(`Done. Inserted ${result.created} problem(s) for ${date}.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to fetch daily problems:", error);
    process.exit(1);
  });
