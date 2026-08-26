import {
  answerCollection,
  db,
  questionCollection,
  voteCollection,
} from "@/models/name";
import { users } from "@/models/server/config";
import { UserPrefs } from "@/store/auth";
import { databases } from "@/models/server/config";
import { getUserFromRequest } from "@/models/server/auth";
import { ownerPermissions } from "@/models/permissions";
import { adjustReputation } from "@/models/server/prefs";
import { NextRequest, NextResponse } from "next/server";
import { Query, ID } from "node-appwrite";

export async function POST(request: NextRequest) {
  try {
    // grab the data

    let createdDocument: any = null;

    // The voter is taken from the verified JWT so a caller cannot cast votes
    // (or farm reputation) on behalf of somebody else.
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to vote" },
        { status: 401 },
      );
    }

    const { voteStatus, type, typeId } = (await request.json()) as {
      voteStatus: "upvote" | "downvote";
      type: "question" | "answer";
      typeId: string;
    };

    if (!voteStatus || !type || !typeId) {
      return NextResponse.json(
        { error: "voteStatus, type and typeId are required" },
        { status: 400 },
      );
    }

    const votedById = user.$id;

    // list-documents there would be no. of collection type typeId authorId and status is there whicha re basically attributes here

    const response = await databases.listDocuments(db, voteCollection, [
      Query.equal("typeId", typeId),
      Query.equal("type", type),
      Query.equal("votedById", votedById),
    ]);

    if (response.documents.length > 0) {
      await databases.deleteDocument(
        db,
        voteCollection,
        response.documents[0].$id,
      );

      // decrease the reputation here

      const QuestionOrAnswer = await databases.getDocument(
        db,
        type === "question" ? questionCollection : answerCollection,
        typeId,
      );

      // merges, so streak/bestStreak survive
      await adjustReputation(
        QuestionOrAnswer.authorId,
        response.documents[0].voteStatus === "upvote" ? -1 : 1,
      );
    }

    // that means the prev vote does not exist or vote status changes
    if (response.documents[0]?.voteStatus !== voteStatus) {
      createdDocument = await databases.createDocument(
        db,
        voteCollection,
        ID.unique(),
        {
          type,
          typeId,
          voteStatus,
          votedById,
        },
        ownerPermissions(votedById),
      );

      const QuestionOrAnswer = await databases.getDocument(
        db,
        type === "question" ? questionCollection : answerCollection,
        typeId,
      );

      // increase or decreae the reputation here (merges, so streak survives)

      // if vote was present
      if (response.documents[0]) {
        await adjustReputation(
          QuestionOrAnswer.authorId,
          //that means the prev vote was "upvote"
          //and new vote is "downvote" so decrease the reputation
          response.documents[0].voteStatus === "upvote" ? -1 : 1,
        );
      } else {
        await adjustReputation(
          QuestionOrAnswer.authorId,
          // that means first time vote is done by the user
          voteStatus === "upvote" ? 1 : -1,
        );
      }
    }

    const [upvotes, downvotes] = await Promise.all([
      databases.listDocuments(db, voteCollection, [
        Query.equal("voteStatus", "upvote"),
        Query.equal("typeId", typeId),
        Query.equal("type", type),
        Query.limit(1),
      ]),
      databases.listDocuments(db, voteCollection, [
        Query.equal("voteStatus", "downvote"),
        Query.equal("typeId", typeId),
        Query.equal("type", type),
        Query.limit(1),
      ]),
    ]);

    return NextResponse.json(
      {
        data: {
          document: createdDocument,
          voteResult: upvotes.total - downvotes.total,
        },
        message: "Vote casted successfully",
      },
      {
        status: 200,
      },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Error in voting",
      },
      {
        status: error?.status || error?.code || 500,
      },
    );
  }
}
