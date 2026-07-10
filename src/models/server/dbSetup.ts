import { db } from "../name";
import { databases } from "./config";

import createQuestionCollection from "./question.collection";
import createAnswerCollection from "./answer.collection";
import createCommentCollection from "./comment.collection";
import createVoteCollection from "./vote.collection";

export default async function getOrCreateDB() {
  try {
    await databases.get(db);
    console.log("Database connected");
  } catch (error) {
    try {
      await databases.create(db, db);
      console.log("Database created successfully");

      await createQuestionCollection();
      console.log(" Question collection created");

      await createAnswerCollection();
      console.log(" Answer collection created");

      await createCommentCollection();
      console.log("Comment collection created");

      await createVoteCollection();
      console.log("Vote collection created");
    } catch (error) {
      console.error(" Error:", error); // now you'll see exactly what failed
      throw error;
    }
  }
  return databases;
}