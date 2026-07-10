import {databases, users} from "@/models/server/config";
import {questionCollection,answerCollection,voteCollection,db} from "@/models/name";

import {Query} from "appwrite";
import React from "react";
import Link from "next/link";
import {Models} from "appwrite";
import QuestionCard from "@/components/QuestionCard";
import Search from "./Search";

import {ShimmerButton} from "@/components/magicui/shimmer-button";

import {UserPrefs} from "@/store/auth";

import Pagination from "@/components/Pagination";

interface Question extends Models.Document {
  title: string;
  content: string;
  author: {
    name: string;
    email: string;
    $id: string;
    reputation: number;
  };
  tags: string[];
  totalVotes: number;
  totalAnswers: number;
}

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tag?: string; search?: string }>;
}) => {
  const { page = "1", tag, search } = await searchParams;

  const queries = [
    Query.orderDesc("$createdAt"),
    Query.offset((+page - 1) * 10),
    Query.limit(10),
  ];

  if (tag) queries.push(Query.equal("tags", tag));

  if (search)
    queries.push(
      Query.or([
        Query.search("title", search),
        Query.search("content", search),
      ]),
    );

  const questions = await databases.listDocuments(
    db,
    questionCollection,
    queries,
  );

  console.log("Questions", questions);

  questions.documents = await Promise.all(
    questions.documents.map(async (question) => {
      const [author, answers, votes] = await Promise.all([
        users.get<UserPrefs>(question.authorId),
        databases.listDocuments(db, answerCollection, [
          Query.equal("questionId", question.$id),
          Query.limit(1),
        ]),

        databases.listDocuments(db, voteCollection, [
          Query.equal("type", "question"),
          Query.equal("typeId", question.$id),
          Query.limit(1),
        ]),
      ]);

      return {
        ...question,
        totalAnswers: answers.total,
        totalVotes: votes.total,
        author: {
          $id: author.$id,
          reputation: author.prefs.reputation,
          name: author.name,
        },
      };
    }),
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-10 flex items-center justify-between">
        <h1 className="text-3xl font-bold">All Questions</h1>
        <Link href="/questions/ask">
          <ShimmerButton className="shadow-2xl">
            <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white dark:from-white dark:to-slate-900/10 lg:text-lg">
              Ask a question
            </span>
          </ShimmerButton>
        </Link>
      </div>

      <div className="mb-6">
        <Search />
      </div>
      <div className="mb-4">
        <p>{questions.total} questions</p>
      </div>
      <div className="mb-4 max-w-3xl space-y-6">
        {(questions.documents as unknown as Question[]).map((question) => (
          <QuestionCard key={question.$id} question={question} />
        ))}
      </div>
      <Pagination total={questions.total} limit={10} />
    </div>
  );
};

export default Page;




