import { Permission, Role, DatabasesIndexType, OrderBy } from "node-appwrite";
import { db, questionCollection } from "../name";
import { databases } from "./config";
import waitForAttributes from "@/lib/waitForAttributes";

export default async function createQuestionCollection() {
  await databases.createCollection(db, questionCollection, questionCollection, [
    Permission.read(Role.any()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ]);

  console.log("Question collection created successfully");

  await Promise.all([
    databases.createStringAttribute(db, questionCollection, "title", 100, true),
    databases.createStringAttribute(
      db,
      questionCollection,
      "content",
      10000,
      true,
    ),
    databases.createStringAttribute(
      db,
      questionCollection,
      "authorId",
      100,
      true,
    ),
    databases.createStringAttribute(
      db,
      questionCollection,
      "tags",
      50,
      true,
      undefined,
      true,
    ),
    databases.createStringAttribute(
      db,
      questionCollection,
      "attachmentId",
      100,
      false,
    ),
  ]);

  console.log("Attributes created, waiting for availability...");

  await waitForAttributes(db, questionCollection);

  console.log("Attributes ready. Creating indexes...");

  await Promise.all([
    databases.createIndex(
      db,
      questionCollection,
      "title",
      DatabasesIndexType.Fulltext,
      ["title"],
      [OrderBy.Asc],
    ),
    databases.createIndex(
      db,
      questionCollection,
      "content",
      DatabasesIndexType.Fulltext,
      ["content"],
      [OrderBy.Asc],
    ),
  ]);

  console.log("Indexes created successfully");
}
