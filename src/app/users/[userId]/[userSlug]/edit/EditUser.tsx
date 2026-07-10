"use client";

import { useAuthStore } from "@/store/auth";
import { useParams, useRouter } from "next/navigation";
import { account } from "@/models/client/config";
import { useState } from "react";
import { ShimmerButton } from "@/components/magicui/shimmer-button";

const EditUser = ({ user }: { user: { name: string; email: string; $id: string } }) => {
  const { userSlug } = useParams();
  const { user: currentUser } = useAuthStore();
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (currentUser?.$id !== user.$id) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        You can only edit your own profile.
      </p>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name === user.name) return;

    setSaving(true);
    setError(null);

    try {
      await account.updateName(name.trim());
      await useAuthStore.getState().verifySession();
      router.push(`/users/${user.$id}/${userSlug}`);
    } catch (err: any) {
      setError(err?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-6">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium">
          Display Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Your display name"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Email</label>
        <input
          type="email"
          value={user.email}
          disabled
          className="w-full cursor-not-allowed rounded-lg border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
        />
        <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed.</p>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-input bg-background px-4 py-2 text-sm transition-colors hover:bg-accent"
        >
          Cancel
        </button>
        <ShimmerButton type="submit" disabled={saving || !name.trim() || name === user.name}>
          <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white">
            {saving ? "Saving..." : "Save Changes"}
          </span>
        </ShimmerButton>
      </div>
    </form>
  );
};

export default EditUser;
