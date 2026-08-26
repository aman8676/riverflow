import React from "react";
import { Query } from "node-appwrite";
import { IconCalendar, IconInbox } from "@tabler/icons-react";

import { databases } from "@/models/server/config";
import { db, dailyProblemCollection } from "@/models/name";
import { todayISODate } from "@/lib/date";
import ProblemCard, { DailyProblem } from "@/components/ProblemCard";
import UserStats from "@/components/UserStats";
import HandleSettings from "@/components/HandleSettings";

// Daily problems change per day and the solved state is per-viewer, so don't
// serve a cached copy of this page.
export const dynamic = "force-dynamic";

async function getProblemsForDate(date: string) {
  return databases.listDocuments(db, dailyProblemCollection, [
    Query.equal("date", date),
    Query.orderAsc("$createdAt"),
    Query.limit(25),
  ]);
}

const DashboardPage = async () => {
  const today = todayISODate();

  let problems = await getProblemsForDate(today);
  let showingDate = today;

  // Fall back to the most recent day that has problems, so the page is useful
  // even when `npm run fetch-daily` hasn't run yet today.
  if (problems.total === 0) {
    const latest = await databases.listDocuments(db, dailyProblemCollection, [
      Query.orderDesc("date"),
      Query.limit(1),
    ]);

    if (latest.total > 0) {
      showingDate = (latest.documents[0] as any).date;
      problems = await getProblemsForDate(showingDate);
    }
  }

  const isToday = showingDate === today;

  // Appwrite returns null-prototype objects, which cannot be handed to a client
  // component. Rebuild each row as a plain object holding only what the card needs.
  const documents: DailyProblem[] = problems.documents.map((document: any) => ({
    $id: document.$id,
    source: document.source,
    problemId: document.problemId,
    title: document.title,
    url: document.url,
    difficulty: document.difficulty,
    tags: Array.from(document.tags ?? []),
    date: document.date,
  }));

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-10">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">
          Daily Practice
        </span>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          Problem Dashboard
        </h1>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <IconCalendar className="h-4 w-4" />
          {isToday ? (
            <>Today&apos;s problems &middot; {showingDate}</>
          ) : (
            <>
              No problems for today yet &mdash; showing the latest set from{" "}
              {showingDate}
            </>
          )}
        </p>
      </div>

      <div className="mb-10 flex flex-col gap-5">
        <UserStats />
        <HandleSettings />
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-20 text-center">
          <IconInbox className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="text-base text-muted-foreground">
              No daily problems have been fetched yet.
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Run{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                npm run fetch-daily
              </code>{" "}
              to populate them.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((problem) => (
            <ProblemCard key={problem.$id} problem={problem} today={today} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
