const CODEFORCES_API_BASE = "https://codeforces.com/api";

/**
 * Codeforces serves 403 and an HTML challenge page to clients without a browser
 * user agent on its non-API routes — which includes the problem page the
 * limits are scraped from.
 */
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

/** Codeforces' usual limits, used when the problem page can't be read. */
export const DEFAULT_TIME_LIMIT_MS = 2000;
export const DEFAULT_MEMORY_LIMIT_KB = 256 * 1024;

export type Difficulty = "easy" | "medium" | "hard";

export interface CodeforcesProblem {
  name: string;
  rating: number;
  tags: string[];
  url: string;
}

interface CodeforcesApiProblem {
  contestId: number;
  index: string;
  name: string;
  rating?: number;
  tags: string[];
}

interface CodeforcesApiStatistic {
  contestId: number;
  index: string;
  solvedCount: number;
}

/** A problemset entry joined with how many people have solved it. */
export interface RatedProblem extends CodeforcesProblem {
  contestId: number;
  index: string;
  problemId: string;
  solvedCount: number;
}

interface CodeforcesApiResponse<T> {
  status: "OK" | "FAILED";
  comment?: string;
  result?: T;
}

const DIFFICULTY_RANGES: Record<Difficulty, [number, number]> = {
  easy: [800, 1200],
  medium: [1300, 1800],
  hard: [1900, Infinity],
};

/**
 * Raised when Codeforces itself is the problem — unreachable, rate limiting, or
 * answering with something unparseable. Deliberately distinct from "the API
 * answered, and that handle does not exist": one is a 502, the other is a 400
 * the user can fix.
 */
export class CodeforcesApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CodeforcesApiError";
  }
}

function buildProblemUrl(contestId: number, index: string): string {
  return `https://codeforces.com/problemset/problem/${contestId}/${index}`;
}

/**
 * Calls a Codeforces API method.
 *
 * Returns `null` on a FAILED response — the API's way of saying "no such
 * handle" — and throws `CodeforcesApiError` when the call never got that far.
 */
async function callApi<T>(
  method: string,
  params: Record<string, string>,
): Promise<T | null> {
  const url = `${CODEFORCES_API_BASE}/${method}?${new URLSearchParams(params)}`;

  let response: Response;

  try {
    response = await fetch(url, { headers: BROWSER_HEADERS, cache: "no-store" });
  } catch (error) {
    throw new CodeforcesApiError(
      `Could not reach Codeforces: ${(error as Error)?.message ?? "network error"}`,
    );
  }

  // A 400 still carries a normal FAILED body. Any other non-OK status is
  // Codeforces rate limiting or being down, and the body won't be JSON.
  if (!response.ok && response.status !== 400) {
    throw new CodeforcesApiError(
      `Codeforces returned status ${response.status}. It may be rate limiting requests — try again in a moment.`,
    );
  }

  let data: CodeforcesApiResponse<T>;

  try {
    data = await response.json();
  } catch {
    throw new CodeforcesApiError("Codeforces returned an unreadable response");
  }

  if (data.status !== "OK" || !data.result) return null;

  return data.result;
}

/**
 * The whole problemset is one ~5 MB response, and both the daily picker and the
 * sheet builder want it. Codeforces rate limits hard (one request every two
 * seconds), so hold it in memory for a few hours rather than re-asking per
 * request. It changes only when a new contest ends.
 */
const PROBLEMSET_TTL_MS = 6 * 60 * 60 * 1000;

let problemsetCache: { at: number; problems: RatedProblem[] } | null = null;

function problemIdOf(contestId: number, index: string): string {
  return `${contestId}${index}`;
}

/**
 * Every rated problem on Codeforces, joined with its solve count.
 *
 * Unrated problems are dropped: without a rating they can't be matched to a
 * user's skill level, which is the only reason either caller wants this list.
 */
export async function getAllRatedProblems(): Promise<RatedProblem[]> {
  if (problemsetCache && Date.now() - problemsetCache.at < PROBLEMSET_TTL_MS) {
    return problemsetCache.problems;
  }

  const result = await callApi<{
    problems: CodeforcesApiProblem[];
    problemStatistics: CodeforcesApiStatistic[];
  }>("problemset.problems", {});

  if (!result) {
    throw new CodeforcesApiError("Codeforces returned an unexpected response");
  }

  const solvedCounts = new Map<string, number>();

  for (const statistic of result.problemStatistics ?? []) {
    solvedCounts.set(
      problemIdOf(statistic.contestId, statistic.index),
      statistic.solvedCount,
    );
  }

  const problems: RatedProblem[] = [];

  for (const problem of result.problems) {
    if (typeof problem.rating !== "number") continue;

    const problemId = problemIdOf(problem.contestId, problem.index);

    problems.push({
      contestId: problem.contestId,
      index: problem.index,
      problemId,
      name: problem.name,
      rating: problem.rating,
      tags: problem.tags,
      url: buildProblemUrl(problem.contestId, problem.index),
      solvedCount: solvedCounts.get(problemId) ?? 0,
    });
  }

  problemsetCache = { at: Date.now(), problems };

  return problems;
}

export interface PickOptions {
  /** Problem ids ("1996C") that must not be chosen — e.g. recently used ones. */
  exclude?: Set<string>;
  /**
   * Source of randomness. The daily picker passes a date-seeded generator so a
   * given day always resolves to the same problems however often it reruns.
   */
  random?: () => number;
}

/**
 * One problem in the rating band for `difficulty`, or `null` if the band is
 * empty after exclusions.
 */
export async function getRandomProblemByDifficulty(
  difficulty: Difficulty,
  options: PickOptions = {},
): Promise<RatedProblem | null> {
  const { exclude, random = Math.random } = options;
  const [min, max] = DIFFICULTY_RANGES[difficulty];

  const problems = await getAllRatedProblems();

  let matching = problems.filter(
    (problem) => problem.rating >= min && problem.rating <= max,
  );

  if (exclude?.size) {
    const fresh = matching.filter((problem) => !exclude.has(problem.problemId));

    // Only apply the exclusion while it leaves something to choose from;
    // repeating a problem beats publishing no problem for that difficulty.
    if (fresh.length > 0) matching = fresh;
  }

  if (matching.length === 0) return null;

  return matching[Math.floor(random() * matching.length)];
}

/**
 * The `limit` most-solved problems matching any of `tags` inside a rating band.
 *
 * "Most solved" is the closest thing Codeforces publishes to a popularity
 * ranking, and it correlates with what a topic's canonical practice problems
 * are: the ones every tutorial points at accumulate solves for years.
 */
export async function getTopProblemsByTag(params: {
  tags: string[];
  minRating: number;
  maxRating: number;
  limit: number;
}): Promise<RatedProblem[]> {
  const { tags, minRating, maxRating, limit } = params;

  const wanted = new Set(tags.map((tag) => tag.toLowerCase()));
  const problems = await getAllRatedProblems();

  return problems
    .filter(
      (problem) =>
        problem.rating >= minRating &&
        problem.rating <= maxRating &&
        problem.tags.some((tag) => wanted.has(tag.toLowerCase())),
    )
    .sort((a, b) => b.solvedCount - a.solvedCount)
    .slice(0, limit);
}

/**
 * A handle's current Codeforces rating, or `null` when the handle is unrated or
 * unknown. Unrated accounts are real and common (nobody has competed yet), so
 * callers treat `null` as "beginner", not as an error.
 */
export async function getUserRating(handle: string): Promise<number | null> {
  const result = await callApi<{ rating?: number }[]>("user.info", {
    handles: handle,
  });

  if (!Array.isArray(result) || result.length === 0) return null;

  const rating = result[0]?.rating;

  return typeof rating === "number" ? rating : null;
}

/**
 * Splits a stored problem id ("1996C", "1234B2") back into the contest id and
 * index that `user.status` reports per submission. `null` for other shapes.
 */
export function parseProblemId(
  problemId: string,
): { contestId: number; index: string } | null {
  const match = problemId.trim().match(/^(\d+)([A-Za-z]\d*)$/);

  if (!match) return null;

  return { contestId: Number(match[1]), index: match[2].toUpperCase() };
}

/** Whether Codeforces knows this handle. Throws if Codeforces can't be asked. */
export async function codeforcesHandleExists(handle: string): Promise<boolean> {
  const result = await callApi<unknown[]>("user.info", { handles: handle });

  return Array.isArray(result) && result.length > 0;
}

export interface CodeforcesSubmission {
  id: number;
  contestId: number;
  index: string;
  creationTimeSeconds: number;
  programmingLanguage: string;
  timeConsumedMillis: number;
  memoryConsumedBytes: number;
}

interface CodeforcesApiSubmission {
  id: number;
  creationTimeSeconds: number;
  problem: { contestId?: number; index: string };
  programmingLanguage: string;
  verdict?: string;
  timeConsumedMillis: number;
  memoryConsumedBytes: number;
}

/**
 * The most recent ACCEPTED submission by `handle` for `problemId`, or `null`.
 *
 * Only the newest 100 submissions are scanned. `user.status` returns them
 * newest-first, so a solve from the window that matters (today) is in range
 * unless the user has submitted 100 times since — and resubmitting brings it
 * back.
 *
 * `notBefore` (unix seconds) discards older accepted submissions. Callers use it
 * to require that the solve happened today AND after the handle was linked, so
 * a handle can't be pointed at somebody else's back catalogue for free points.
 */
export async function findAcceptedSubmission(
  handle: string,
  problemId: string,
  notBefore = 0,
): Promise<CodeforcesSubmission | null> {
  const problem = parseProblemId(problemId);

  if (!problem) return null;

  const result = await callApi<CodeforcesApiSubmission[]>("user.status", {
    handle,
    from: "1",
    count: "100",
  });

  if (!result) return null;

  const match = result.find(
    (submission) =>
      submission.verdict === "OK" &&
      submission.problem.contestId === problem.contestId &&
      submission.problem.index.toUpperCase() === problem.index &&
      submission.creationTimeSeconds >= notBefore,
  );

  if (!match) return null;

  return {
    id: match.id,
    contestId: problem.contestId,
    index: problem.index,
    creationTimeSeconds: match.creationTimeSeconds,
    programmingLanguage: match.programmingLanguage,
    timeConsumedMillis: match.timeConsumedMillis,
    memoryConsumedBytes: match.memoryConsumedBytes,
  };
}

export interface ProblemLimits {
  timeLimitMs: number;
  memoryLimitKb: number;
}

/**
 * Time and memory limits for a problem, scraped from its page.
 *
 * The limits aren't in the API, and they are exactly what a measured runtime has
 * to be judged against — 900ms is excellent under a 4s limit and mediocre under
 * 1s. Best effort by design: if the scrape breaks it falls back to Codeforces'
 * usual limits rather than failing, so scoring never blocks on a layout change.
 */
export async function getProblemLimits(url: string): Promise<ProblemLimits> {
  const fallback: ProblemLimits = {
    timeLimitMs: DEFAULT_TIME_LIMIT_MS,
    memoryLimitKb: DEFAULT_MEMORY_LIMIT_KB,
  };

  try {
    const response = await fetch(url, {
      headers: BROWSER_HEADERS,
      cache: "no-store",
    });

    if (!response.ok) return fallback;

    const html = await response.text();

    const seconds = html.match(/time limit per test<\/div>\s*([\d.]+)\s*second/i);
    const megabytes = html.match(
      /memory limit per test<\/div>\s*([\d.]+)\s*megabyte/i,
    );

    return {
      timeLimitMs: seconds
        ? Math.round(parseFloat(seconds[1]) * 1000)
        : fallback.timeLimitMs,
      memoryLimitKb: megabytes
        ? Math.round(parseFloat(megabytes[1]) * 1024)
        : fallback.memoryLimitKb,
    };
  } catch {
    return fallback;
  }
}
