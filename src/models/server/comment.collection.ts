import { Role, Permission, DatabasesIndexType, OrderBy } from "node-appwrite";
import { commentCollection, db } from "../name";
import { databases } from "./config";
import waitForAttributes from "@/lib/waitForAttributes";

export default async function createCommentCollection() {
  await databases.createCollection(db, commentCollection, commentCollection, [
    Permission.read(Role.any()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ]);

  console.log("Comment collection created successfully");

  await Promise.all([
    databases.createStringAttribute(db, commentCollection, "content", 10000, true),
    databases.createEnumAttribute(db, commentCollection, "type", ["answer", "question"], true),
    databases.createStringAttribute(db, commentCollection, "typeId", 50, true),
    databases.createStringAttribute(db, commentCollection, "authorId", 50, true),
  ]);

  console.log("Comment Attributes created, waiting for availability...");

  await waitForAttributes(db, commentCollection);

  await Promise.all([
    databases.createIndex(
      db,
      commentCollection,
      "content",
      DatabasesIndexType.Fulltext,
      ["content"],
      [OrderBy.Asc],
    ),
    databases.createIndex(
      db,
      commentCollection,
      "typeId",
      DatabasesIndexType.Key,
      ["typeId"],
      [OrderBy.Asc],
    ),
    databases.createIndex(
      db,
      commentCollection,
      "type",
      DatabasesIndexType.Key,
      ["type"],
      [OrderBy.Asc],
    ),
  ]);
}
