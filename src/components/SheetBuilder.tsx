"use client";

import React from "react";
import {
  IconAlertTriangle,
  IconBolt,
  IconChevronDown,
  IconExternalLink,
  IconLoader2,
  IconRefresh,
  IconTargetArrow,
  IconTrendingUp,
} from "@tabler/icons-react";

import { authedJsonHeaders } from "@/models/client/authHeaders";
import { useAuthStore } from "@/store/auth";
import { PLATFORM_LABELS, Platform } from "@/lib/handles";
import { DSA_TOPICS, TIERS, TierId } from "@/lib/sheet";
import { cn } from "@/lib/utils";

interface SheetProblem {
  platform: Platform;
  problemId: string;
  title: string;
  url: string;
  difficulty: string;
  rating?: number;
  solvedCount?: number;
  acRate?: number;
  tags: string[];
}

interface SheetResponse {
  tier: {
    id: TierId;
    label: string;
    ratingLabel: string;
    blurb: string;
    codeforces: { minRating: number; maxRating: number };
    leetcode: string[];
  };
  topic: {
    id: string;
    label: string;
    summary: string;
    keyIdeas: string[];
  };
  rating: number | null;
  ratingSource: "manual" | "codeforces" | "default";
  handle: string;
  problems: SheetProblem[];
  sources: { codeforces: boolean; leetcode: boolean };
}

const SOURCE_STYLES: Record<Platform, string> = {
  codeforces: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  leetcode: "bg-amber-500/10 text-amber-500 border-amber-500/30",
};

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "text-emerald-500",
  medium: "text-amber-500",
  hard: "text-red-500",
};

/**
 * Codeforces difficulty is a number, LeetCode's is a word. Colour the number by
 * the band it falls in so both platforms read the same way down the list.
 */
function difficultyClass(problem: SheetProblem): string {
  if (problem.platform === "leetcode") {
    return (
      DIFFICULTY_STYLES[problem.difficulty.toLowerCase()] ??
      "text-muted-foreground"
    );
  }

  const rating = problem.rating ?? 0;

  if (rating <= 1100) return DIFFICULTY_STYLES.easy;
  if (rating <= 1600) return DIFFICULTY_STYLES.medium;
  return DIFFICULTY_STYLES.hard;
}

function formatSolvedCount(count: number): string {
  return count >= 1000 ? `${Math.round(count / 1000)}k solved` : `${count} solved`;
}

const RATING_SOURCE_LABELS: Record<SheetResponse["ratingSource"], string> = {
  manual: "using the rating you entered",
  codeforces: "from your linked Codeforces rating",
  default: "no rating found - showing the beginner band",
};

/**
 * Builds a practice sheet for one DSA topic, sized to the user's skill.
 *
 * The rating comes from the user's linked Codeforces account when there is one,
 * so the common path is a single click on a topic. Overriding it by hand (or
 * picking a band directly) is there for people who haven't linked an account or
 * want to practise above their current level.
 */
/** What a build is for, when it differs from the state the inputs are in. */
interface BuildOverrides {
  topic?: string;
  tier?: TierId | "auto";
  rating?: string;
}

const SheetBuilder = () => {
  const { user, hydrated } = useAuthStore();

  const [topicId, setTopicId] = React.useState(DSA_TOPICS[0].id);
  const [tierId, setTierId] = React.useState<TierId | "auto">("auto");
  const [rating, setRating] = React.useState("");
  const [sheet, setSheet] = React.useState<SheetResponse | null>(null);
  // The first sheet is fetched as soon as the session is known, so the page
  // opens in its loading state rather than flashing an empty one.
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const topic = DSA_TOPICS.find((entry) => entry.id === topicId) ?? DSA_TOPICS[0];

  /**
   * Fetches a sheet and swaps it in.
   *
   * Overrides exist because a topic button has to build for the topic it just
   * selected, and the state holding that selection hasn't been applied yet when
   * its handler runs.
   *
   * Nothing here touches state before the first `await`: the effect below calls
   * it during render-commit, where a synchronous setState would cascade.
   */
  const loadSheet = React.useCallback(
    async (overrides: BuildOverrides = {}) => {
      const nextTopic = overrides.topic ?? topicId;
      const nextTier = overrides.tier ?? tierId;
      const nextRating = (overrides.rating ?? rating).trim();

      try {
        const params = new URLSearchParams({ topic: nextTopic });

        if (nextTier !== "auto") params.set("tier", nextTier);
        if (nextRating) params.set("rating", nextRating);

        // Signed in and letting the rating be inferred? Send the JWT so the
        // route can read the linked Codeforces handle off the account.
        const headers =
          user && nextTier === "auto" && !nextRating
            ? await authedJsonHeaders().catch(() => undefined)
            : undefined;

        const response = await fetch(`/api/sheet?${params}`, { headers });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Could not build your sheet");
        }

        setSheet(data as SheetResponse);
        setError("");
      } catch (err) {
        setSheet(null);
        setError((err as Error)?.message || "Could not build your sheet");
      } finally {
        setLoading(false);
      }
    },
    [topicId, tierId, rating, user],
  );

  const build = React.useCallback(
    (overrides: BuildOverrides = {}) => {
      setLoading(true);
      void loadSheet(overrides);
    },
    [loadSheet],
  );

  const selectTopic = (nextTopicId: string) => {
    setTopicId(nextTopicId);
    build({ topic: nextTopicId });
  };

  // Build the first sheet once the session is known, so a signed-in user's
  // rating is available on the very first request rather than a beat later.
  React.useEffect(() => {
    if (!hydrated) return;
    // Fetching from an external API is what an effect is for; the lint rule
    // can't see that every setState in `loadSheet` happens after an await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSheet();
    // Deliberately only on hydration: every later build is user-triggered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const partial =
    sheet && (!sheet.sources.codeforces || !sheet.sources.leetcode);

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-2xl border border-border bg-card/40 p-5 backdrop-blur-sm">
        <div className="flex flex-col gap-5">
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <IconTargetArrow className="h-4 w-4" />
              Topic
            </label>
            <div className="flex flex-wrap gap-2">
              {DSA_TOPICS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => selectTopic(entry.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    entry.id === topicId
                      ? "border-orange-500/50 bg-orange-500/15 text-orange-500"
                      : "border-border bg-secondary text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <label
                htmlFor="sheet-tier"
                className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground"
              >
                <IconTrendingUp className="h-4 w-4" />
                Level
              </label>
              <div className="relative">
                <select
                  id="sheet-tier"
                  value={tierId}
                  onChange={(event) =>
                    setTierId(event.target.value as TierId | "auto")
                  }
                  className="h-11 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-9 text-sm text-foreground outline-none transition-colors focus:border-orange-500/50"
                >
                  <option value="auto">Match my rating</option>
                  {TIERS.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.label} ({tier.ratingLabel})
                    </option>
                  ))}
                </select>
                <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <div>
              <label
                htmlFor="sheet-rating"
                className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground"
              >
                Codeforces rating
              </label>
              <input
                id="sheet-rating"
                type="number"
                min={0}
                max={4000}
                inputMode="numeric"
                value={rating}
                onChange={(event) => setRating(event.target.value)}
                disabled={tierId !== "auto"}
                placeholder={
                  user?.prefs?.codeforcesHandle
                    ? `Auto from @${user.prefs.codeforcesHandle}`
                    : "Leave blank if unrated"
                }
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-orange-500/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <button
              type="button"
              onClick={() => build()}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                  Building
                </>
              ) : (
                <>
                  <IconRefresh className="h-4 w-4" />
                  Build sheet
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/20 p-5">
        <h2 className="text-lg font-black tracking-tight">{topic.label}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{topic.summary}</p>
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {topic.keyIdeas.map((idea) => (
            <li
              key={idea}
              className="flex items-start gap-2 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground"
            >
              <IconBolt className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
              {idea}
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {sheet && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-xl font-black tracking-tight">
                {sheet.problems.length} problems &middot; {sheet.tier.label}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {sheet.tier.blurb}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {sheet.rating !== null && `Rating ${sheet.rating} · `}
              {RATING_SOURCE_LABELS[sheet.ratingSource]}
            </p>
          </div>

          {partial && (
            <p className="flex items-start gap-2 text-xs text-amber-500">
              <IconAlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {sheet.sources.codeforces ? "LeetCode" : "Codeforces"} didn&apos;t
              answer, so this sheet is drawn from the other platform only. Try
              rebuilding in a moment.
            </p>
          )}

          {sheet.problems.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
              Neither platform has problems for this topic at this level. Try a
              different level or topic.
            </p>
          ) : (
            <ol className="flex flex-col gap-2">
              {sheet.problems.map((problem, index) => (
                <li key={`${problem.platform}-${problem.problemId}`}>
                  <a
                    href={problem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 rounded-xl border border-border bg-card/40 px-4 py-3 transition-colors hover:border-orange-500/40 hover:bg-card/70"
                  >
                    <span className="w-6 shrink-0 text-sm font-bold tabular-nums text-muted-foreground/60">
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground transition-colors group-hover:text-orange-500">
                        {problem.title}
                      </p>
                      {problem.tags.length > 0 && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {problem.tags.slice(0, 4).join(" · ")}
                        </p>
                      )}
                    </div>

                    <span
                      className={cn(
                        "hidden shrink-0 text-xs font-bold uppercase tracking-wider sm:block",
                        difficultyClass(problem),
                      )}
                    >
                      {problem.difficulty}
                    </span>

                    <span className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground lg:block">
                      {problem.solvedCount !== undefined
                        ? formatSolvedCount(problem.solvedCount)
                        : problem.acRate !== undefined
                          ? `${problem.acRate}% AC`
                          : ""}
                    </span>

                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                        SOURCE_STYLES[problem.platform],
                      )}
                    >
                      {PLATFORM_LABELS[problem.platform]}
                    </span>

                    <IconExternalLink className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </a>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {loading && !sheet && (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
          <IconLoader2 className="h-4 w-4 animate-spin" />
          Pulling problems from Codeforces and LeetCode...
        </div>
      )}
    </div>
  );
};

export default SheetBuilder;
