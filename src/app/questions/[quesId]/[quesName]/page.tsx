import Answers from "@/components/Answers";
import Comments from "@/components/CommentSection";
import { UserPrefs } from "@/store/auth";
import VoteButtons from "@/components/VoteButton";
import { Particles } from "@/components/magicui/particles";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { avatar } from "@/models/client/config";
import { MarkdownPreview } from "@/components/RTE";

import {
  answerCollection,
  commentCollection,
  questionCollection,
  voteCollection,
  db,
  questionAttachmentBucket,
} from "@/models/name";

import { databases, users } from "@/models/server/config";
import { storage } from "@/models/server/config";
import relativeTime from "@/utils/relativeTime";
import slugify from "slugify";
import { IconEdit } from "@tabler/icons-react";
import Link from "next/link";
import { Query } from "node-appwrite";
import React from "react";
import DeleteQuestion from "./DeleteQuestion";
import EditQuestion from "./EditQuestion";
import { TracingBeam } from "@/components/ui/tracing-beam";

const FALLBACK_IMAGE = "/placeholder.svg";

function getFileViewUrl(bucketId: string, fileId: string): string {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

  return `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`;
}

const Page = async ({
  params,
}: {
  params: Promise<{ quesId: string; quesName: string }>;
}) => {
  const { quesId } = await params;
  const [question, answers, upvotes, downvotes, comments] = await Promise.all([
    databases.getDocument(db, questionCollection, quesId),
    databases.listDocuments(db, answerCollection, [
      Query.orderDesc("$createdAt"),
      Query.equal("questionId", quesId),
    ]),

    databases.listDocuments(db, voteCollection, [
      Query.equal("typeId", quesId),
      Query.equal("type", "question"),
      Query.equal("voteStatus", "upvote"),
      Query.limit(1),
    ]),
    databases.listDocuments(db, voteCollection, [
      Query.equal("typeId", quesId),
      Query.equal("type", "question"),
      Query.equal("voteStatus", "downvote"),
      Query.limit(1),
    ]),
    databases.listDocuments(db, commentCollection, [
      Query.equal("type", "question"),
      Query.equal("typeId", quesId),
      Query.orderDesc("$createdAt"),
    ]),
  ]);
  const author = await users.get<UserPrefs>(question.authorId);
  console.log({ quesId });
  console.log("djhdjksk");
  console.log(quesId);

  const [updatedComments, updatedAnswers] = await Promise.all([
    Promise.all(
      comments.documents.map(async (comment) => {
        const author = await users.get<UserPrefs>(comment.authorId);
        return {
          ...comment,
          author: {
            $id: author.$id,
            name: author.name,
            reputation: author.prefs.reputation,
          },
        };
      }),
    ),
    Promise.all(
      answers.documents.map(async (answer) => {
        const [author, comments, upvotes, downvotes] = await Promise.all([
          users.get<UserPrefs>(answer.authorId),
          databases.listDocuments(db, commentCollection, [
            Query.equal("type", "answer"),
            Query.equal("typeId", answer.$id),
            Query.orderDesc("$createdAt"),
          ]),
          databases.listDocuments(db, voteCollection, [
            Query.equal("typeId", answer.$id),
            Query.equal("type", "answer"),
            Query.equal("voteStatus", "upvote"),
            Query.limit(1), // for optimization
          ]),
          databases.listDocuments(db, voteCollection, [
            Query.equal("typeId", answer.$id),
            Query.equal("type", "answer"),
            Query.equal("voteStatus", "downvote"),
            Query.limit(1), // for optimization
          ]),
        ]);

        comments.documents = await Promise.all(
          comments.documents.map(async (comment) => {
            const author = await users.get<UserPrefs>(comment.authorId);
            return {
              ...comment,
              author: {
                $id: author.$id,
                name: author.name,
                reputation: author.prefs.reputation,
              },
            };
          }),
        );

     upvotes.documents = await Promise.all(
       upvotes.documents.map(async (upvote) => {
         const user = await users.get<UserPrefs>(upvote.votedById);

         return {
           ...upvote,
           user: {
             $id: user.$id,
             name: user.name,
             reputation: user.prefs.reputation,
           },
         };
       }),
     );

        downvotes.documents = await Promise.all(
          downvotes.documents.map(async (downvote) => {
            const user = await users.get<UserPrefs>(downvote.votedById);

            return {
              ...downvote,
              user: {
                $id: user.$id,
                name: user.name,
                reputation: user.prefs.reputation,
              },
            };
          }),
        );

        const plainAnswerComments = {
          total: comments.total,
          documents: comments.documents,
        };

        const plainAnswerUpvotes = {
          total: upvotes.total,
          documents: upvotes.documents,
        };

        const plainAnswerDownvotes = {
          total: downvotes.total,
          documents: downvotes.documents,
        };

        return {
          ...answer,
          comments: plainAnswerComments,
          upvotesDocuments: plainAnswerUpvotes,
          downvotesDocuments: plainAnswerDownvotes,
          author: {
            $id: author.$id,
            name: author.name,
            reputation: author.prefs.reputation,
          },
        };
      }),
    ),
  ]);

  const plainQuestionComments = {
    total: comments.total,
    documents: updatedComments,
  };

  const plainQuestionAnswers = {
    total: answers.total,
    documents: updatedAnswers,
  };

  const plainUpvotes = {
    total: upvotes.total,
    documents: upvotes.documents.map((document) => ({ ...document })),
  };

  const plainDownvotes = {
    total: downvotes.total,
    documents: downvotes.documents.map((document) => ({ ...document })),
  };

  return (
    <TracingBeam className="container pl-6">
      <Particles
        className="fixed inset-0 h-full w-full"
        quantity={500}
        ease={100}
        color="#ffffff"
        refresh
      />
      <div className="relative mx-auto px-4 pb-20 pt-36">
        <div className="flex">
          <div className="w-full">
            <h1 className="mb-1 text-3xl font-bold">{question.title}</h1>
            <div className="flex gap-4 text-sm">
              <span>Asked {relativeTime(new Date(question.$createdAt))}</span>
              <span>Answer {answers.total}</span>
              <span>Votes {upvotes.total + downvotes.total}</span>
            </div>
          </div>
          <Link href="/questions/ask" className="ml-auto inline-block shrink-0">
            <ShimmerButton className="shadow-2xl">
              <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white dark:from-white dark:to-slate-900/10 lg:text-lg">
                Ask a question
              </span>
            </ShimmerButton>
          </Link>
        </div>
        <hr className="my-4 border-white/40" />
        <div className="flex gap-4">
          <div className="flex shrink-0 flex-col items-center gap-4">
            <VoteButtons
              type="question"
              id={question.$id}
              className="w-full"
              upvotes={plainUpvotes as any}
              downvotes={plainDownvotes as any}
            />
            <EditQuestion
              questionId={question.$id}
              questionTitle={question.title}
              authorId={question.authorId}
            />
            <DeleteQuestion
              questionId={question.$id}
              authorId={question.authorId}
            />
          </div>
          <div className="w-full overflow-auto">
            <MarkdownPreview
              className="rounded-xl p-4"
              source={question.content}
            />
            <picture>
              {question.attachmentId ? (
                <img
                  src={getFileViewUrl(
                    questionAttachmentBucket,
                    question.attachmentId,
                  )}
                  alt={question.title}
                  className="mt-3 rounded-lg"
                />
              ) : (
                <img
                  src={FALLBACK_IMAGE}
                  alt={question.title}
                  className="mt-3 rounded-lg"
                />
              )}
            </picture>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              {question.tags.map((tag: string) => (
                <Link
                  key={tag}
                  href={`/questions?tag=${tag}`}
                  className="inline-block rounded-lg bg-white/10 px-2 py-0.5 duration-200 hover:bg-white/20"
                >
                  #{tag}
                </Link>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-end gap-1">
              <picture>
                <img
                  src={avatar.getInitials(author.name, 36, 36)}
                  alt={author.name}
                  className="rounded-lg"
                />
              </picture>
              <div className="block leading-tight">
                <Link
                  href={`/users/${author.$id}/${slugify(author.name)}`}
                  className="text-orange-500 hover:text-orange-600"
                >
                  {author.name}
                </Link>
                <p>
                  <strong>{author.prefs.reputation}</strong>
                </p>
              </div>
            </div>
            <Comments
              comments={plainQuestionComments as any}
              className="mt-4"
              type="question"
              typeId={question.$id}
            />
            <hr className="my-4 border-white/40" />
          </div>
        </div>
        <Answers
          answers={plainQuestionAnswers as any}
          questionId={question.$id}
        />
      </div>
    </TracingBeam>
  );
};

export default Page;
