import QuestionCard from "@/components/QuestionCard";
import { answerCollection, db, questionCollection, voteCollection } from "@/models/name";
import { databases, users } from "@/models/server/config";
import { UserPrefs } from "@/store/auth";
import { Query } from "node-appwrite";
import React from "react";
import { Models } from "appwrite";

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


const LatestQuestions = async () => {
    const questions = await databases.listDocuments(db, questionCollection, [
        Query.limit(5),
        Query.orderDesc("$createdAt"),
    ]);
    console.log("Fetched Questions:", questions);

    questions.documents = await Promise.all(
        questions.documents.map(async question => {
            const [author, answers, votes] = await Promise.all([
                users.get<UserPrefs>(question.authorId),
                databases.listDocuments(db, answerCollection, [
                    Query.equal("questionId", question.$id),
                    Query.limit(1), // for optimization
                ]),
                databases.listDocuments(db, voteCollection, [
                    Query.equal("type", "question"),
                    Query.equal("typeId", question.$id),
                    Query.limit(1), // for optimization
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
        })
    );

    console.log("Latest question")
    console.log(questions)
    return (
      <div className="space-y-6">
        {questions.documents.map((question) => (
          <QuestionCard
            key={question.$id}
            question={question as unknown as Question}
          />
        ))}
      </div>
    );
};

export default LatestQuestions;