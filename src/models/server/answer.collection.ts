import { DatabasesIndexType, Permission, Role, OrderBy } from "node-appwrite";
import { answerCollection, db } from "../name";
import { databases } from "./config";
import waitForAttributes from "@/lib/waitForAttributes";

export default async function createAnswerCollection() {
  await databases.createCollection(db, answerCollection, answerCollection, [
    Permission.read(Role.any()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ]);

  console.log("Answer collection created successfully");

  await Promise.all([
    databases.createStringAttribute(db, answerCollection, "content", 10000, true),
    databases.createStringAttribute(db, answerCollection, "questionId", 50, true),
    databases.createStringAttribute(db, answerCollection, "authorId", 50, true),
  ]);

  console.log("Answer Attributes created, waiting for availability...");

  await waitForAttributes(db, answerCollection);

  await Promise.all([
    databases.createIndex(
      db,
      answerCollection,
      "content",
      DatabasesIndexType.Fulltext,
      ["content"],
      [OrderBy.Asc],
    ),
    databases.createIndex(
      db,
      answerCollection,
      "questionId",
      DatabasesIndexType.Key,
      ["questionId"],
      [OrderBy.Asc],
    ),
    databases.createIndex(
      db,
      answerCollection,
      "authorId",
      DatabasesIndexType.Key,
      ["authorId"],
      [OrderBy.Asc],
    ),
  ]);

  console.log("Indexes created successfully");
}
