"use client";

import React from "react";
import { Query } from "appwrite";
import {
  IconAlertTriangle,
  IconBolt,
  IconCheck,
  IconClock,
  IconDatabase,
  IconExternalLink,
  IconLoader2,
  IconShieldCheck,
  IconTrophy,
} from "@tabler/icons-react";

import { databases } from "@/models/client/config";
import { authedJsonHeaders } from "@/models/client/authHeaders";
import { db, solvedProblemCollection } from "@/models/name";
import { useAuthStore } from "@/store/auth";
import { PLATFORM_LABELS, Platform } from "@/lib/handles";
import { EfficiencyTier, TIER_LABELS } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export interface DailyProblem {
  $id: string;
  source: Platform;
  problemId: string;
  title: string;
  url: string;
  difficulty: string;
  tags: string[];
  date: string;
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

const TIER_STYLES: Record<EfficiencyTier, string> = {
  optimal: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  efficient: "border-teal-500/30 bg-teal-500/10 text-teal-500",
  acceptable: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  slow: "border-orange-500/30 bg-orange-500/10 text-orange-500",
  unknown: "border-border bg-secondary text-muted-foreground",
};

function difficultyClass(difficulty: string) {
  return DIFFICULTY_STYLES[difficulty.toLowerCase()] ?? "text-muted-foreground";
}

function isTier(value: unknown): value is EfficiencyTier {
  return typeof value === "string" && value in TIER_LABELS;
}

function formatRuntime(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`;
}

function formatMemory(kb: number): string {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

/** What the card knows about this user's accepted submission, if any. */
interface SolveDetails {
  tier: EfficiencyTier | null;
  points: number | null;
  runtimeMs: number | null;
  memoryKb: number | null;
}

const EMPTY_DETAILS: SolveDetails = {
  tier: null,
  points: null,
  runtimeMs: null,
  memoryKb: null,
};

const Metric = ({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) => (
  <span className="flex items-center gap-1 text-xs text-muted-foreground">
    <Icon className="h-3.5 w-3.5" />
    {children}
  </span>
);

/**
 * One daily problem.
 *
 * The flow is deliberately two steps: open the problem on the platform, solve it
 * there, then come back and claim it. Claiming doesn't record a solve on trust —
 * `/api/solve` asks the platform for an accepted submission by the user's linked
 * handle and scores it from what the judge measured.
 *
 * `today` is supplied by the server rather than computed here on purpose: the
 * server stamps the date when recording a solve, so if the viewer's timezone
 * differs from the server's (e.g. an IST visitor against a UTC deployment) a
 * locally-computed date would query a different day than the one written.
 */
const ProblemCard = ({
  problem,
  today,
}: {
  problem: DailyProblem;
  today: string;
}) => {
  const { user, hydrated, setPrefs } = useAuthStore();

  const [solved, setSolved] = React.useState(false);
  const [details, setDetails] = React.useState<SolveDetails>(EMPTY_DETAILS);
  const [checking, setChecking] = React.useState(true);
  const [verifying, setVerifying] = React.useState(false);
  const [opened, setOpened] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [error, setError] = React.useState("");
  const [needsHandle, setNeedsHandle] = React.useState(false);

  const platformLabel = PLATFORM_LABELS[problem.source];
  const handle = user?.prefs?.[
    problem.source === "codeforces" ? "codeforcesHandle" : "leetcodeHandle"
  ];

  // Reflect whether this user already claimed this problem today.
  React.useEffect(() => {
    if (!hydrated) return;

    if (!user) {
      setSolved(false);
      setChecking(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await databases.listDocuments(
          db,
          solvedProblemCollection,
          [
            Query.equal("userId", user.$id),
            Query.equal("problemId", problem.problemId),
            Query.equal("dateSolved", today),
            Query.limit(1),
          ],
        );

        if (cancelled) return;

        setSolved(response.total > 0);

        const row = response.documents[0] as any;

        if (row) {
          setDetails({
            tier: isTier(row.efficiency) ? row.efficiency : null,
            points: typeof row.points === "number" ? row.points : null,
            runtimeMs: typeof row.runtimeMs === "number" ? row.runtimeMs : null,
            memoryKb: typeof row.memoryKb === "number" ? row.memoryKb : null,
          });
        }
      } catch {
        // Non-fatal: leave the card in its unsolved state.
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, hydrated, problem.problemId, today]);

  const claim = async () => {
    if (!user || solved || verifying) return;

    setVerifying(true);
    setError("");
    setNotice("");
    setNeedsHandle(false);

    try {
      const response = await fetch("/api/solve", {
        method: "POST",
        headers: await authedJsonHeaders(),
        body: JSON.stringify({
          problemId: problem.problemId,
          source: problem.source,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // The platform account isn't linked yet — point at the form instead of
        // showing a bare error.
        if (data?.needsHandle) setNeedsHandle(true);
        throw new Error(data?.error || "Could not verify your solution");
      }

      // Verified false is a normal answer, not a failure: no accepted submission
      // for this problem today (yet).
      if (!data.verified) {
        setNotice(data.message || "No accepted submission found yet");
        return;
      }

      setSolved(true);
      setDetails({
        tier: isTier(data.efficiency) ? data.efficiency : null,
        points: typeof data.awardedPoints === "number" ? data.awardedPoints : null,
        runtimeMs: typeof data.runtimeMs === "number" ? data.runtimeMs : null,
        memoryKb: typeof data.memoryKb === "number" ? data.memoryKb : null,
      });

      // The route returns the authoritative totals; push them into the store so
      // the stats strip updates without a reload.
      setPrefs({
        points: data.points,
        streak: data.streak,
        bestStreak: data.bestStreak,
      });
    } catch (err) {
      setError((err as Error)?.message || "Could not verify your solution");
    } finally {
      setVerifying(false);
    }
  };

  const claimDisabled = !user || checking || verifying || solved;

  return (
    <div className="group relative flex flex-col gap-4 rounded-2xl border border-border bg-card/40 p-5 backdrop-blur-sm transition-all duration-200 hover:bg-card/70 hover:shadow-md">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
            SOURCE_STYLES[problem.source],
          )}
        >
          {platformLabel}
        </span>
        <span
          className={cn(
            "text-xs font-bold uppercase tracking-wider",
            difficultyClass(problem.difficulty),
          )}
        >
          {problem.difficulty}
        </span>
        {solved && (
          <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-emerald-500">
            <IconTrophy className="h-3.5 w-3.5" />
            {details.points !== null && details.points > 0
              ? `+${details.points} points`
              : "Solved today"}
          </span>
        )}
      </div>

      <a
        href={problem.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setOpened(true)}
        className="flex items-start gap-1.5 text-lg font-bold leading-snug text-foreground transition-colors hover:text-orange-500"
      >
        {problem.title}
        <IconExternalLink className="mt-1 h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
      </a>

      {problem.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {problem.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-lg bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {solved && (details.tier || details.runtimeMs !== null) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {details.tier && (
            <span
              className={cn(
                "flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                TIER_STYLES[details.tier],
              )}
            >
              <IconBolt className="h-3.5 w-3.5" />
              {TIER_LABELS[details.tier]}
            </span>
          )}
          {details.runtimeMs !== null && (
            <Metric icon={IconClock}>{formatRuntime(details.runtimeMs)}</Metric>
          )}
          {details.memoryKb !== null && (
            <Metric icon={IconDatabase}>{formatMemory(details.memoryKb)}</Metric>
          )}
        </div>
      )}

      {notice && (
        <p className="flex items-start gap-1.5 text-xs text-amber-500">
          <IconAlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {notice}
        </p>
      )}

      {error && (
        <p className="text-xs text-destructive">
          {error}
          {needsHandle && (
            <>
              {" "}
              <a
                href="#linked-accounts"
                className="font-semibold underline underline-offset-2"
              >
                Link it above
              </a>
              .
            </>
          )}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-2">
        <a
          href={problem.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpened(true)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80"
        >
          Solve on {platformLabel}
          <IconExternalLink className="h-4 w-4" />
        </a>

        {!solved && (
          <button
            type="button"
            onClick={claim}
            disabled={claimDisabled}
            title={
              !user
                ? "Sign in to track your progress"
                : !handle
                  ? `Link your ${platformLabel} account to earn points`
                  : undefined
            }
            className={cn(
              "inline-flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition-colors",
              opened
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                : "border-border bg-secondary text-foreground hover:bg-secondary/70",
              claimDisabled && "cursor-not-allowed opacity-50",
            )}
          >
            {verifying ? (
              <>
                <IconLoader2 className="h-4 w-4 animate-spin" />
                Checking {platformLabel}...
              </>
            ) : (
              <>
                <IconShieldCheck className="h-4 w-4" />
                I solved it — verify
              </>
            )}
          </button>
        )}

        {solved && (
          <span className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-sm font-semibold text-emerald-500">
            <IconCheck className="h-4 w-4" />
            Verified on {platformLabel}
          </span>
        )}
      </div>
    </div>
  );
};

export default ProblemCard;
