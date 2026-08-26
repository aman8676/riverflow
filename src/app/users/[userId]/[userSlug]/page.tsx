import { databases, users } from "@/models/server/config";
import { UserPrefs } from "@/store/auth";
import React from "react";
import StatCard from "@/components/StatCard";
import { BorderBeam } from "@/components/magicui/border-beam";
import { answerCollection, db, questionCollection } from "@/models/name";
import { Query } from "node-appwrite";
import Link from "next/link";
import slugify from "slugify";
import relativeTime from "@/utils/relativeTime";

const Page = async ({
  params,
}: {
  params: Promise<{ userId: string; userSlug: string }>;
}) => {
  const { userId } = await params;

  const [user, answers, questions, recentQuestions, recentAnswers] =
    await Promise.all([
      users.get<UserPrefs>(userId),
      databases.listDocuments(db, answerCollection, [
        Query.equal("authorId", userId),
        Query.limit(1),
      ]),
      databases.listDocuments(db, questionCollection, [
        Query.equal("authorId", userId),
        Query.limit(1),
      ]),
      databases.listDocuments(db, questionCollection, [
        Query.equal("authorId", userId),
        Query.orderDesc("$createdAt"),
        Query.limit(3),
      ]),
      databases.listDocuments(db, answerCollection, [
        Query.equal("authorId", userId),
        Query.orderDesc("$createdAt"),
        Query.limit(3),
      ]),
    ]);

  const enrichedAnswers = await Promise.all(
    (recentAnswers.documents || []).map(async (a) => {
      try {
        const question = await databases.getDocument(
          db,
          questionCollection,
          a.questionId,
        );
        return { ...a, question };
      } catch (e) {
        return { ...a, question: { title: "Unknown Question" } };
      }
    }),
  );

  return (
    <div className="w-full space-y-12 py-4">
      {/* 1. Stats Dashboard Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Reputation"
          value={Number(user.prefs?.reputation) || 0}
          from="#f97316"
          to="#d946ef"
          gradient="from-orange-500 to-pink-500"
        />
        <StatCard
          label="Questions Asked"
          value={questions.total || 0}
          from="#06b6d4"
          to="#3b82f6"
          gradient="from-cyan-500 to-blue-500"
        />
        <StatCard
          label="Answers Contributed"
          value={answers.total || 0}
          from="#22c55e"
          to="#06b6d4"
          gradient="from-emerald-500 to-cyan-500"
        />
        <StatCard
          label="Practice Points"
          value={Number(user.prefs?.points) || 0}
          from="#a855f7"
          to="#6366f1"
          gradient="from-purple-500 to-indigo-500"
        />
        <StatCard
          label="Current Streak"
          value={Number(user.prefs?.streak) || 0}
          from="#f97316"
          to="#ef4444"
          gradient="from-orange-500 to-red-500"
          caption={
            (Number(user.prefs?.streak) || 0) === 1 ? "day in a row" : "days in a row"
          }
        />
        <StatCard
          label="Best Streak"
          value={Number(user.prefs?.bestStreak) || 0}
          from="#eab308"
          to="#f97316"
          gradient="from-yellow-500 to-orange-500"
          caption={
            (Number(user.prefs?.bestStreak) || 0) === 1 ? "day" : "days"
          }
        />
      </div>

      {/* 2. Activity Lists */}
      <div className="space-y-12">
        {recentQuestions.documents && recentQuestions.documents.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Recent Questions
              </h2>
              <span className="rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                {recentQuestions.documents.length}
              </span>
            </div>
            <div className="space-y-4">
              {recentQuestions.documents.map((q: any) => (
                <div
                  key={`q-${q.$id}`}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card/20 p-6 transition-all duration-300 hover:bg-card/50 shadow-sm hover:shadow-md"
                >
                  <BorderBeam size={120} duration={8} delay={2} />
                  <div className="relative z-10">
                    <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="font-medium">
                        {relativeTime(new Date(q.$createdAt))}
                      </span>
                    </div>
                    <Link
                      href={`/questions/${q.$id}/${slugify(q.title || "untitled")}`}
                      className="text-lg font-bold text-foreground transition-colors group-hover:text-orange-500 block leading-snug"
                    >
                      {q.title}
                    </Link>
                    {q.tags?.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {q.tags.map((tag: string) => (
                          <Link
                            key={`tag-${tag}-${q.$id}`}
                            href={`/questions?tag=${tag}`}
                            className="inline-block rounded-lg bg-secondary border border-border/60 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            #{tag}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {enrichedAnswers && enrichedAnswers.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Recent Answers
              </h2>
              <span className="rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                {enrichedAnswers.length}
              </span>
            </div>
            <div className="space-y-4">
              {enrichedAnswers.map((a: any) => (
                <div
                  key={`a-${a.$id}`}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card/20 p-6 transition-all duration-300 hover:bg-card/50 shadow-sm hover:shadow-md"
                >
                  <BorderBeam size={120} duration={8} delay={4} />
                  <div className="relative z-10">
                    <div className="mb-3 text-xs text-muted-foreground">
                      Answered{" "}
                      <span className="font-medium text-foreground/70">
                        {relativeTime(new Date(a.$createdAt))}
                      </span>{" "}
                      on{" "}
                      <Link
                        href={`/questions/${a.questionId}/${slugify(a.question?.title || "untitled")}`}
                        className="font-bold text-orange-500 hover:underline"
                      >
                        {a.question?.title}
                      </Link>
                    </div>
                    <div className="line-clamp-3 text-sm leading-relaxed text-muted-foreground group-hover:text-foreground/90 transition-colors">
                      {a.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {(!recentQuestions.documents ||
          recentQuestions.documents.length === 0) &&
          (!enrichedAnswers || enrichedAnswers.length === 0) && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/5 py-16 px-4 text-center">
              <p className="text-base font-medium text-muted-foreground">
                No recent activity on this profile yet.
              </p>
            </div>
          )}
      </div>
    </div>
  );
};

export default Page;
 