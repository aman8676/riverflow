import { databases } from "@/models/server/config";
import {
  db,
  voteCollection,
  questionCollection,
  answerCollection,
} from "@/models/name";
import { Query } from "node-appwrite";
import Link from "next/link";
import slugify from "slugify";
import relativeTime from "@/utils/relativeTime";
import { IconArrowUp, IconArrowDown, IconInbox } from "@tabler/icons-react";
import { BorderBeam } from "@/components/magicui/border-beam";

const Page = async ({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string; userSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) => {
  const { userId } = await params;
  const { page = "1" } = await searchParams;

  const votes = await databases.listDocuments(db, voteCollection, [
    Query.equal("votedById", userId),
    Query.orderDesc("$createdAt"),
    Query.offset((+page - 1) * 10),
    Query.limit(10),
  ]);

  const enriched = await Promise.all(
    votes.documents.map(async (v) => {
      if (v.type === "question") {
        const question = await databases.getDocument(
          db,
          questionCollection,
          v.typeId,
        );
        return {
          ...v,
          title: question.title,
          href: `/questions/${v.typeId}/${slugify(question.title)}`,
        };
      }
      const answer = await databases.getDocument(db, answerCollection, v.typeId);
      const question = await databases.getDocument(
        db,
        questionCollection,
        answer.questionId,
      );
      return {
        ...v,
        title: question.title,
        href: `/questions/${answer.questionId}/${slugify(question.title)}`,
      };
    }),
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
          <IconArrowUp className="h-5 w-5 text-cyan-500" />
          Votes
        </h2>
        <span className="text-sm text-muted-foreground">
          {votes.total} total
        </span>
      </div>

      {enriched.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-20 text-center">
          <IconInbox className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-base text-muted-foreground">No votes yet.</p>
        </div>
      )}

      <div className="space-y-4">
        {enriched.map((v: any) => (
          <div
            key={v.$id}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card/30 p-5 transition-all duration-200 hover:bg-card/60 hover:shadow-md"
          >
            <BorderBeam size={80} duration={10} delay={3} />
            <div className="relative z-10 flex items-start gap-4">
              <div className="shrink-0 pt-1">
                {v.voteStatus === "upvote" ? (
                  <IconArrowUp className="h-5 w-5 text-green-500" />
                ) : (
                  <IconArrowDown className="h-5 w-5 text-red-500" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {v.voteStatus === "upvote" ? "Upvoted" : "Downvoted"}{" "}
                  {v.type === "question" ? "a question" : "an answer"}{" "}
                  <span>{relativeTime(new Date(v.$createdAt))}</span>
                </p>
                <Link
                  href={v.href}
                  className="text-base font-medium text-orange-500 transition-colors hover:text-orange-600"
                >
                  {v.title}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Page;
