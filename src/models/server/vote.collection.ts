import { Permission, Role, DatabasesIndexType, OrderBy } from "node-appwrite";
import { db, voteCollection } from "../name";
import { databases } from "./config";
import waitForAttributes from "@/lib/waitForAttributes";

export default async function createVoteCollection() {
  await databases.createCollection(db, voteCollection, voteCollection, [
    Permission.read(Role.any()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ]);

  console.log("Vote collection created successfully");

  await Promise.all([
    databases.createEnumAttribute(
      db,
      voteCollection,
      "type",
      ["question", "answer"],
      true,
    ),
    databases.createStringAttribute(db, voteCollection, "typeId", 50, true),
    databases.createEnumAttribute(
      db,
      voteCollection,
      "voteStatus",
      ["upvote", "downvote"],
      true,
    ),
    databases.createStringAttribute(db, voteCollection, "votedById", 50, true),
  ]);

  console.log("Vote Attributes created, waiting for availability...");

  await waitForAttributes(db, voteCollection);

  await Promise.all([
    databases.createIndex(
      db,
      voteCollection,
      "typeId",
      DatabasesIndexType.Key,
      ["typeId"],
      [OrderBy.Asc],
    ),
    databases.createIndex(
      db,
      voteCollection,
      "type",
      DatabasesIndexType.Key,
      ["type"],
      [OrderBy.Asc],
    ),
    databases.createIndex(
      db,
      voteCollection,
      "voteStatus",
      DatabasesIndexType.Key,
      ["voteStatus"],
      [OrderBy.Asc],
    ),
  ]);
}
