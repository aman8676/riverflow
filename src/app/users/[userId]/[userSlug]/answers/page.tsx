import { databases } from "@/models/server/config";
import { db, answerCollection, questionCollection } from "@/models/name";
import { Query } from "node-appwrite";
import Link from "next/link";
import slugify from "slugify";
import relativeTime from "@/utils/relativeTime";
import { BorderBeam } from "@/components/magicui/border-beam";
import { IconMessages, IconInbox } from "@tabler/icons-react";

const Page = async ({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string; userSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) => {
  const { userId } = await params;
  const { page = "1" } = await searchParams;

  const answers = await databases.listDocuments(db, answerCollection, [
    Query.equal("authorId", userId),
    Query.orderDesc("$createdAt"),
    Query.offset((+page - 1) * 10),
    Query.limit(10),
  ]);

  const enriched = await Promise.all(
    answers.documents.map(async (a) => {
      const question = await databases.getDocument(
        db,
        questionCollection,
        a.questionId,
      );
      return { ...a, question };
    }),
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
          <IconMessages className="h-5 w-5 text-cyan-500" />
          Answers
        </h2>
        <span className="text-sm text-muted-foreground">
          {answers.total} total
        </span>
      </div>

      {enriched.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-20 text-center">
          <IconInbox className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-base text-muted-foreground">No answers yet.</p>
        </div>
      )}

      <div className="space-y-4">
        {enriched.map((a: any) => (
          <div
            key={a.$id}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card/30 p-5 transition-all duration-200 hover:bg-card/60 hover:shadow-md"
          >
            <BorderBeam size={80} duration={10} delay={3} />
            <div className="relative z-10">
              <div className="mb-2 text-xs text-muted-foreground">
                Answered {relativeTime(new Date(a.$createdAt))} on{" "}
                <Link
                  href={`/questions/${a.questionId}/${slugify(a.question.title)}`}
                  className="font-medium text-orange-500 hover:text-orange-600"
                >
                  {a.question.title}
                </Link>
              </div>
              <div className="line-clamp-3 text-sm leading-relaxed text-foreground/75">
                {a.content}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Page;
