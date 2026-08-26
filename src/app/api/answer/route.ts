import { NextRequest, NextResponse } from "next/server";
import { databases, users } from "@/models/server/config";
import { answerCollection, db } from "@/models/name";
import { ID } from "node-appwrite";
import { UserPrefs } from "@/store/auth";
import { getUserFromRequest } from "@/models/server/auth";
import { ownerPermissions } from "@/models/permissions";
import { adjustReputation } from "@/models/server/prefs";

export async function POST(request: NextRequest) {
  try {
    // The acting user comes from the verified JWT, never from the request body.
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to post an answer" },
        { status: 401 },
      );
    }

    const { questionId, answer } = await request.json();

    if (!questionId || !answer) {
      return NextResponse.json(
        { error: "questionId and answer are required" },
        { status: 400 },
      );
    }

    const authorId = user.$id;

    const response = await databases.createDocument(
      db,
      answerCollection,
      ID.unique(),
      {
        content: answer,
        questionId: questionId,
        authorId: authorId,
      },
      ownerPermissions(authorId),
    );

    // increase author reputation (merges, so streak/bestStreak survive)

    const prefs = await adjustReputation(authorId, 1);

    return NextResponse.json(
      {
        answer: response,
        reputation: prefs.reputation,
      },

      {
        status: 201,
      },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Error creating answer",
      },
      {
        status: error?.statusCode || 500,
      },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to delete an answer" },
        { status: 401 },
      );
    }

    const { answerId } = await request.json();

    if (!answerId) {
      return NextResponse.json(
        { error: "answerId is required" },
        { status: 400 },
      );
    }

    const answer = await databases.getDocument(db, answerCollection, answerId);

    // The admin key bypasses document permissions, so ownership must be
    // enforced here explicitly.
    if (answer.authorId !== user.$id) {
      return NextResponse.json(
        { error: "You can only delete your own answers" },
        { status: 403 },
      );
    }

    const response = await databases.deleteDocument(
      db,
      answerCollection,
      answerId,
    );

    // decrease the reputation (merges, so streak/bestStreak survive)

    await adjustReputation(answer.authorId, -1);

    return NextResponse.json(
      {
        data: response,
      },
      {
        status: 200,
      },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error?.message || "Error deleting answer",
      },
      {
        status: error?.status || error?.code || 500,
      },
    );
  }
}
