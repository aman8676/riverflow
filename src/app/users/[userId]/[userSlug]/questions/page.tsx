import { databases } from "@/models/server/config";
import {
  db,
  questionCollection,
  answerCollection,
  voteCollection,
} from "@/models/name";
import { Query } from "node-appwrite";
import Link from "next/link";
import slugify from "slugify";
import relativeTime from "@/utils/relativeTime";
import { BorderBeam } from "@/components/magicui/border-beam";
import { Badge } from "@/components/ui/badge";
import { IconHelp, IconInbox } from "@tabler/icons-react";

const Page = async ({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string; userSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) => {
  const { userId } = await params;
  const { page = "1" } = await searchParams;

  const questions = await databases.listDocuments(db, questionCollection, [
    Query.equal("authorId", userId),
    Query.orderDesc("$createdAt"),
    Query.offset((+page - 1) * 10),
    Query.limit(10),
  ]);

  const enriched = await Promise.all(
    questions.documents.map(async (q) => {
      const [answers, votes] = await Promise.all([
        databases.listDocuments(db, answerCollection, [
          Query.equal("questionId", q.$id),
          Query.limit(1),
        ]),
        databases.listDocuments(db, voteCollection, [
          Query.equal("type", "question"),
          Query.equal("typeId", q.$id),
          Query.limit(1),
        ]),
      ]);
      return { ...q, totalAnswers: answers.total, totalVotes: votes.total };
    }),
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
          <IconHelp className="h-5 w-5 text-cyan-500" />
          Questions
        </h2>
        <span className="text-sm text-muted-foreground">
          {questions.total} total
        </span>
      </div>

      {enriched.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-20 text-center">
          <IconInbox className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-base text-muted-foreground">No questions yet.</p>
          <Link
            href="/questions/ask"
            className="text-sm font-medium text-orange-500 hover:text-orange-600"
          >
            Ask your first question →
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {enriched.map((q: any) => (
          <div
            key={q.$id}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card/30 p-5 transition-all duration-200 hover:bg-card/60 hover:shadow-md"
          >
            <BorderBeam size={80} duration={10} delay={3} />
            <div className="relative z-10">
              <div className="mb-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span>{q.totalVotes} votes</span>
                <span>{q.totalAnswers} answers</span>
                <span>{relativeTime(new Date(q.$createdAt))}</span>
              </div>
              <Link
                href={`/questions/${q.$id}/${slugify(q.title)}`}
                className="text-lg font-semibold text-orange-500 transition-colors hover:text-orange-600"
              >
                {q.title}
              </Link>
              {q.tags?.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {q.tags.map((tag: string) => (
                    <Link key={tag} href={`/questions?tag=${tag}`}>
                      <Badge
                        variant="secondary"
                        className="font-medium transition-colors hover:bg-muted/80"
                      >
                        #{tag}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Page;
