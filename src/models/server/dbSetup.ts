import { db, questionCollection, answerCollection, commentCollection, voteCollection, dailyProblemCollection, solvedProblemCollection } from "../name";
import { databases } from "./config";

import createQuestionCollection from "./question.collection";
import createAnswerCollection from "./answer.collection";
import createCommentCollection from "./comment.collection";
import createVoteCollection from "./vote.collection";
import createDailyProblemCollection, {
  ensureDailyProblemAttributes,
} from "./dailyProblem.collection";
import createSolvedProblemCollection, {
  ensureSolvedProblemAttributes,
} from "./solvedProblem.collection";

/**
 * `migrate` runs only for a collection that already existed — a freshly created
 * one has the current schema already. It backfills attributes added after the
 * project was first provisioned; without it those columns exist only on new
 * projects and every write of them fails on an old one.
 */
async function ensureCollection(
  collectionId: string,
  label: string,
  create: () => Promise<void>,
  migrate?: () => Promise<void>,
) {
  let exists = true;

  try {
    await databases.getCollection(db, collectionId);
  } catch (error) {
    exists = false;
  }

  // Deliberately outside the try: a failure inside `migrate` must surface, not
  // fall through to `create` and attempt to re-create a collection that is
  // already there.
  if (!exists) {
    await create();
    console.log(`${label} collection created`);
    return;
  }

  console.log(`${label} collection connected`);

  if (migrate) await migrate();
}

export default async function getOrCreateDB() {
  try {
    await databases.get(db);
    console.log("Database connected");
  } catch (error) {
    try {
      await databases.create(db, db);
      console.log("Database created successfully");
    } catch (error) {
      console.error(" Error:", error); // now you'll see exactly what failed
      throw error;
    }
  }

  await ensureCollection(questionCollection, "Question", createQuestionCollection);
  await ensureCollection(answerCollection, "Answer", createAnswerCollection);
  await ensureCollection(commentCollection, "Comment", createCommentCollection);
  await ensureCollection(voteCollection, "Vote", createVoteCollection);
  await ensureCollection(
    dailyProblemCollection,
    "Daily problem",
    createDailyProblemCollection,
    ensureDailyProblemAttributes,
  );
  await ensureCollection(
    solvedProblemCollection,
    "Solved problem",
    createSolvedProblemCollection,
    ensureSolvedProblemAttributes,
  );

  return databases;
}
