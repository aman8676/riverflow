const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";

/**
 * LeetCode's GraphQL endpoint answers unauthenticated requests, but only when it
 * believes a browser is asking: without a Referer it intermittently returns 403.
 */
const GRAPHQL_HEADERS = {
  "Content-Type": "application/json",
  Referer: "https://leetcode.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
};

/** Raised when LeetCode is unreachable or answers with something unusable. */
export class LeetCodeApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeetCodeApiError";
  }
}

interface GraphQLResponse<T> {
  data?: T | null;
  errors?: { message: string }[];
}

/**
 * Runs a GraphQL query.
 *
 * Returns `null` when LeetCode answers with errors or no data — which is what a
 * query for a non-existent user looks like — and throws `LeetCodeApiError` when
 * the request itself failed, so callers can tell "wrong username" from
 * "LeetCode is down".
 */
async function query<T>(
  operationName: string,
  document: string,
  variables: Record<string, unknown> = {},
): Promise<T | null> {
  let response: Response;

  try {
    response = await fetch(LEETCODE_GRAPHQL_URL, {
      method: "POST",
      headers: GRAPHQL_HEADERS,
      body: JSON.stringify({ operationName, query: document, variables }),
      cache: "no-store",
    });
  } catch (error) {
    throw new LeetCodeApiError(
      `Could not reach LeetCode: ${(error as Error)?.message ?? "network error"}`,
    );
  }

  if (!response.ok) {
    throw new LeetCodeApiError(
      `LeetCode returned status ${response.status}. It may be rate limiting requests — try again in a moment.`,
    );
  }

  let payload: GraphQLResponse<T>;

  try {
    payload = await response.json();
  } catch {
    throw new LeetCodeApiError("LeetCode returned an unreadable response");
  }

  if (payload.errors?.length || !payload.data) return null;

  return payload.data;
}

const DAILY_QUESTION_QUERY = `
  query questionOfToday {
    activeDailyCodingChallengeQuestion {
      date
      link
      question {
        title
        titleSlug
        difficulty
      }
    }
  }
`;

export interface LeetCodeDailyProblem {
  title: string;
  titleSlug: string;
  difficulty: string;
  url: string;
}

export async function getDailyLeetCodeProblem(): Promise<LeetCodeDailyProblem | null> {
  try {
    const data = await query<{
      activeDailyCodingChallengeQuestion?: {
        date: string;
        link: string;
        question: { title: string; titleSlug: string; difficulty: string };
      } | null;
    }>("questionOfToday", DAILY_QUESTION_QUERY);

    const daily = data?.activeDailyCodingChallengeQuestion;

    if (!daily) return null;

    return {
      title: daily.question.title,
      titleSlug: daily.question.titleSlug,
      difficulty: daily.question.difficulty,
      url: `https://leetcode.com${daily.link}`,
    };
  } catch {
    return null;
  }
}

const USER_QUERY = `
  query userPublicProfile($username: String!) {
    matchedUser(username: $username) {
      username
    }
  }
`;

/** Whether LeetCode knows this username. Throws if LeetCode can't be asked. */
export async function leetcodeHandleExists(username: string): Promise<boolean> {
  const data = await query<{ matchedUser: { username: string } | null }>(
    "userPublicProfile",
    USER_QUERY,
    { username },
  );

  return Boolean(data?.matchedUser);
}

const RECENT_AC_QUERY = `
  query recentAcSubmissions($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      id
      title
      titleSlug
      timestamp
    }
  }
`;

const SUBMISSION_DETAILS_QUERY = `
  query submissionDetails($submissionId: Int!) {
    submissionDetails(submissionId: $submissionId) {
      runtime
      runtimeDisplay
      runtimePercentile
      memory
      memoryDisplay
      memoryPercentile
    }
  }
`;

export interface LeetCodeAcSubmission {
  id: string;
  titleSlug: string;
  /** Unix seconds. */
  timestamp: number;
  runtimeMs: number | null;
  memoryKb: number | null;
  runtimePercentile: number | null;
  memoryPercentile: number | null;
}

/** "52 ms" -> 52, "1.4 s" -> 1400, anything else -> null. */
function parseRuntimeDisplay(display: unknown): number | null {
  if (typeof display !== "string") return null;

  const match = display.match(/([\d.]+)\s*(ms|s)\b/i);

  if (!match) return null;

  const value = parseFloat(match[1]);

  if (!Number.isFinite(value)) return null;

  return match[2].toLowerCase() === "s" ? Math.round(value * 1000) : Math.round(value);
}

/** "16.4 MB" -> 16794, "512 KB" -> 512, anything else -> null. */
function parseMemoryDisplay(display: unknown): number | null {
  if (typeof display !== "string") return null;

  const match = display.match(/([\d.]+)\s*(kb|mb|gb)\b/i);

  if (!match) return null;

  const value = parseFloat(match[1]);

  if (!Number.isFinite(value)) return null;

  const multiplier = { kb: 1, mb: 1024, gb: 1024 * 1024 }[
    match[2].toLowerCase() as "kb" | "mb" | "gb"
  ];

  return Math.round(value * multiplier);
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Per-submission runtime and memory, when LeetCode will hand them over.
 *
 * Unlike Codeforces' `user.status`, LeetCode's public submission list carries no
 * performance data at all — `submissionDetails` does, but LeetCode only answers
 * it for a logged-in session's own submissions, so for our anonymous requests it
 * usually comes back empty.
 *
 * It is still worth asking: when it does answer, the percentiles are a better
 * efficiency signal than anything derivable elsewhere (they rank the solution
 * against every other accepted one). When it doesn't, the solve is still
 * verified and simply scores at the base rate — see `rateEfficiency`.
 */
async function getSubmissionMetrics(submissionId: string) {
  const empty = {
    runtimeMs: null,
    memoryKb: null,
    runtimePercentile: null,
    memoryPercentile: null,
  };

  const numericId = Number(submissionId);

  if (!Number.isFinite(numericId)) return empty;

  try {
    const data = await query<{
      submissionDetails: {
        runtime?: number;
        runtimeDisplay?: string;
        runtimePercentile?: number;
        memory?: number;
        memoryDisplay?: string;
        memoryPercentile?: number;
      } | null;
    }>("submissionDetails", SUBMISSION_DETAILS_QUERY, {
      submissionId: numericId,
    });

    const details = data?.submissionDetails;

    if (!details) return empty;

    return {
      runtimeMs:
        parseRuntimeDisplay(details.runtimeDisplay) ??
        finiteOrNull(details.runtime),
      memoryKb:
        parseMemoryDisplay(details.memoryDisplay) ??
        // `memory` is reported in bytes.
        (finiteOrNull(details.memory) !== null
          ? Math.round((details.memory as number) / 1024)
          : null),
      runtimePercentile: finiteOrNull(details.runtimePercentile),
      memoryPercentile: finiteOrNull(details.memoryPercentile),
    };
  } catch {
    // Never let the optional enrichment fail a verification that succeeded.
    return empty;
  }
}

/**
 * The most recent accepted submission by `username` for `titleSlug`, or `null`.
 *
 * `notBefore` (unix seconds) discards older ones so a freshly linked handle
 * can't claim credit for solves that predate it.
 */
export async function findAcceptedSubmission(
  username: string,
  titleSlug: string,
  notBefore = 0,
): Promise<LeetCodeAcSubmission | null> {
  const data = await query<{
    recentAcSubmissionList:
      | { id: string; title: string; titleSlug: string; timestamp: string }[]
      | null;
  }>("recentAcSubmissions", RECENT_AC_QUERY, { username, limit: 20 });

  const submissions = data?.recentAcSubmissionList;

  if (!submissions?.length) return null;

  const match = submissions.find(
    (submission) =>
      submission.titleSlug === titleSlug &&
      Number(submission.timestamp) >= notBefore,
  );

  if (!match) return null;

  const metrics = await getSubmissionMetrics(match.id);

  return {
    id: match.id,
    titleSlug: match.titleSlug,
    timestamp: Number(match.timestamp),
    ...metrics,
  };
}

const PROBLEM_LIST_QUERY = `
  query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
    problemsetQuestionList: questionList(
      categorySlug: $categorySlug
      limit: $limit
      skip: $skip
      filters: $filters
    ) {
      total: totalNum
      questions: data {
        questionFrontendId
        title
        titleSlug
        difficulty
        acRate
        isPaidOnly
        topicTags {
          name
          slug
        }
      }
    }
  }
`;

export type LeetCodeDifficulty = "EASY" | "MEDIUM" | "HARD";

export interface LeetCodeProblem {
  questionId: string;
  title: string;
  titleSlug: string;
  /** "Easy" | "Medium" | "Hard", as LeetCode capitalises it. */
  difficulty: string;
  /** Acceptance rate as a percentage, e.g. 54.2. */
  acRate: number;
  tags: string[];
  url: string;
}

interface LeetCodeApiQuestion {
  questionFrontendId: string;
  title: string;
  titleSlug: string;
  difficulty: string;
  acRate: number;
  isPaidOnly: boolean;
  topicTags: { name: string; slug: string }[];
}

/**
 * How many problems to pull per (topic, difficulty) before ranking them. A topic
 * like "array" has well over a thousand entries and LeetCode returns them in id
 * order, so a page of 100 is plenty to rank from without paging the whole set.
 */
const CANDIDATE_PAGE_SIZE = 100;

/**
 * The `limit` best-known free problems for a topic at the given difficulties.
 *
 * LeetCode only exposes its real popularity signal (the frequency bar) to paying
 * accounts, so "best known" is approximated by problem number: LeetCode assigns
 * ids in order of publication, and the canonical interview problems every list
 * points at — Two Sum, Valid Parentheses, Course Schedule — are the early ones.
 * Ties inside a difficulty are broken by acceptance rate, highest first, which
 * puts the more approachable problem first.
 *
 * Premium-only problems are dropped: their links open a paywall, which is
 * useless in a practice sheet.
 */
export async function getTopProblemsByTopic(params: {
  topicSlugs: string[];
  difficulties: LeetCodeDifficulty[];
  limit: number;
}): Promise<LeetCodeProblem[]> {
  const { topicSlugs, difficulties, limit } = params;

  // One request per (topic, difficulty): LeetCode's `difficulty` filter takes a
  // single enum, and its `tags` filter is an AND across tags rather than an OR.
  const requests = topicSlugs.flatMap((slug) =>
    difficulties.map(async (difficulty) => {
      const data = await query<{
        problemsetQuestionList: {
          questions: LeetCodeApiQuestion[] | null;
        } | null;
      }>("problemsetQuestionList", PROBLEM_LIST_QUERY, {
        categorySlug: "",
        skip: 0,
        limit: CANDIDATE_PAGE_SIZE,
        filters: { tags: [slug], difficulty },
      });

      return data?.problemsetQuestionList?.questions ?? [];
    }),
  );

  const pages = await Promise.all(
    requests.map((request) =>
      // A topic that returns nothing shouldn't sink the whole sheet.
      request.catch(() => [] as LeetCodeApiQuestion[]),
    ),
  );

  const bySlug = new Map<string, LeetCodeProblem>();

  for (const question of pages.flat()) {
    if (question.isPaidOnly || bySlug.has(question.titleSlug)) continue;

    bySlug.set(question.titleSlug, {
      questionId: question.questionFrontendId,
      title: question.title,
      titleSlug: question.titleSlug,
      difficulty: question.difficulty,
      acRate: Math.round((question.acRate ?? 0) * 10) / 10,
      tags: question.topicTags?.map((tag) => tag.name) ?? [],
      url: `https://leetcode.com/problems/${question.titleSlug}/`,
    });
  }

  return Array.from(bySlug.values())
    .sort((a, b) => {
      const byId = Number(a.questionId) - Number(b.questionId);
      return byId !== 0 ? byId : b.acRate - a.acRate;
    })
    .slice(0, limit);
}
