"use client";

import { useAuthStore } from "@/store/auth";
import Link from "next/link";
import { useParams } from "next/navigation";
import { IconEdit } from "@tabler/icons-react";

const EditButton = () => {
  const { userId, userSlug } = useParams();
  const { user } = useAuthStore();

  if (user?.$id !== userId) return null;

  return (
    <Link
      href={`/users/${userId}/${userSlug}/edit`}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <IconEdit className="h-4 w-4" />
      Edit profile
    </Link>
  );
};

export default EditButton;
