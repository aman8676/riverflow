"use client";

import { databases } from "@/models/client/config";
import { authedJsonHeaders } from "@/models/client/authHeaders";
import { useAuthStore } from "@/store/auth";
import { voteCollection, db } from "@/models/name";
import { cn } from "@/lib/utils";
import { IconCaretUpFilled, IconCaretDownFilled } from "@tabler/icons-react";
import { ID, Models, Query } from "appwrite";
import { useRouter } from "next/navigation";
import React from "react";

const VoteButtons = ({
  type,
  id,
  upvotes,
  downvotes,
  className,
}: {
  type: "question" | "answer";
  id: string;
  upvotes: Models.DocumentList<Models.Document>;
  downvotes: Models.DocumentList<Models.Document>;
  className?: string;
}) => {
  const [votedDocument, setVotedDocument] = React.useState<any>(null);
  const [voteResult, setVoteResult] = React.useState<number>(
    upvotes.total - downvotes.total,
  );
  const { user } = useAuthStore();

  const router = useRouter();

  React.useEffect(() => {
    (async () => {
      if (!user) return;
      if (user) {
        const response = await databases.listDocuments(db, voteCollection, [
          Query.equal("type", type),
          Query.equal("typeId", id),
          Query.equal("votedById", user.$id),
        ]);
        setVotedDocument(() => response.documents[0] || null);
      }
    })();
  }, [user, type, id]);

  const toggleUpvote = async () => {
    if (!user) return router.push("/login");

    if (votedDocument === undefined) return;

    try {
      const response = await fetch(`/api/vote`, {
        method: "POST",
        headers: await authedJsonHeaders(),
        body: JSON.stringify({
          voteStatus: "upvote",
          type,
          typeId: id,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw data;

      setVoteResult(() => data.data.voteResult);
      setVotedDocument(() => data.data.document ?? null);
    } catch (error: any) {
      window.alert(error?.message || "Something went wrong");
    }
  };

  const toggleDownvote = async () => {
    if (!user) return router.push("/login");

    if (votedDocument === undefined) return;

    try {
      const response = await fetch(`/api/vote`, {
        method: "POST",
        headers: await authedJsonHeaders(),
        body: JSON.stringify({
          voteStatus: "downvote",
          type,
          typeId: id,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw data;

      setVoteResult(() => data.data.voteResult);
         setVotedDocument(() => data.data.document ?? null);
    } catch (error: any) {
      window.alert(error?.message || "Something went wrong");
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <button
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border p-1 duration-200 hover:bg-white/10",
          votedDocument && votedDocument.voteStatus === "upvote"
            ? "border-orange-500 text-orange-500"
            : "border-white/30",
        )}
        onClick={toggleUpvote}
      >
        <IconCaretUpFilled />
      </button>
      <span>{voteResult}</span>
      <button
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border p-1 duration-200 hover:bg-white/10",
          votedDocument && votedDocument.voteStatus === "downvote"
            ? "border-orange-500 text-orange-500"
            : "border-white/30",
        )}
        onClick={toggleDownvote}
      >
        <IconCaretDownFilled />
      </button>
    </div>
  );
};

export default VoteButtons;
