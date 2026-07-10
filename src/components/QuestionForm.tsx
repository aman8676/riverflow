"use client";

import React from "react";
import { useRouter } from "next/navigation";
import slugify from "slugify";
import { Models, ID } from "appwrite";
import { IconX } from "@tabler/icons-react";
import confetti from "canvas-confetti";

import RTE from "@/components/RTE";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { databases, storage } from "@/models/client/config";
import {
  questionAttachmentBucket,
  db,
  questionCollection,
} from "@/models/name";

type QuestionDocument = Models.Document & {
  title: string;
  content: string;
  tags: string[];
  attachmentId: string;
  authorId: string;
};

const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "relative flex w-full flex-col space-y-2 overflow-visible rounded-xl border border-border bg-card/60 p-5 backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </div>
  );
};

const QuestionForm = ({ question }: { question?: QuestionDocument }) => {
  const { user } = useAuthStore();
  const [tag, setTag] = React.useState("");
  const router = useRouter();

  const [formData, setFormData] = React.useState({
    title: String(question?.title || ""),
    content: String(question?.content || ""),
    authorId: user?.$id || "",
    tags: new Set((question?.tags || []) as string[]),
    attachment: null as File | null,
  });

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  // Fixes the empty author ID bug by listening to user session load states
  React.useEffect(() => {
    if (user?.$id) {
      setFormData((prev) => ({ ...prev, authorId: user.$id }));
    }
  }, [user]);

  const loadConfetti = (timeinMs = 3000) => {
    const end = Date.now() + timeinMs;
    const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1", "#fff6c3"];

    const frame = () => {
      if (Date.now() > end) return;

      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        startVelocity: 40,
        origin: { x: 0, y: 0.5 },
        colors: colors,
      });

      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors: colors,
      });

      requestAnimationFrame(frame);
    };

    frame();
  };

  const create = async () => {
    let attachmentId = "";

    if (formData.attachment) {
      const storageResponse = await storage.createFile(
        questionAttachmentBucket,
        ID.unique(),
        formData.attachment,
      );
      attachmentId = storageResponse.$id;
    }

    const response = await databases.createDocument(
      db,
      questionCollection,
      ID.unique(),
      {
        title: formData.title,
        content: formData.content,
        authorId: formData.authorId,
        tags: Array.from(formData.tags),
        attachmentId: attachmentId,
      },
    );

    loadConfetti();
    return response;
  };

  const update = async () => {
    if (!question) throw new Error("Please provide a question");

    const attachmentId = await (async () => {
      if (!formData.attachment) return question?.attachmentId as string;

      if (question?.attachmentId) {
        await storage.deleteFile(
          questionAttachmentBucket,
          question.attachmentId,
        );
      }

      const file = await storage.createFile(
        questionAttachmentBucket,
        ID.unique(),
        formData.attachment,
      );

      return file.$id;
    })();

    const response = await databases.updateDocument(
      db,
      questionCollection,
      question.$id,
      {
        title: formData.title,
        content: formData.content,
        tags: Array.from(formData.tags),
        attachmentId: attachmentId,
      },
    );

    return response;
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.authorId) {
      setError("You must be logged in to post or update a question.");
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      setError("Please fill out both the title and content fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = question ? await update() : await create();
      router.push(`/questions/${response.$id}/${slugify(formData.title)}`);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={submit}>
      {error && (
        <div className="relative flex w-full flex-col rounded-xl border border-red-500/30 bg-destructive/10 p-4 text-center">
          <span className="text-sm font-medium text-red-400">{error}</span>
        </div>
      )}

      {/* TITLE FIELD */}
      <LabelInputContainer>
        <Label htmlFor="title" className="text-foreground font-medium text-base">
          Title Address
          <span className="block text-xs font-normal text-muted-foreground mt-1">
            Be specific and imagine you are asking a question to another person.
          </span>
        </Label>
        <Input
          id="title"
          name="title"
          placeholder="e.g. Is there an R function for finding the index of an element in a vector?"
          type="text"
          className="mt-2"
          value={formData.title}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, title: e.target.value }))
          }
        />
      </LabelInputContainer>

      {/* CONTENT FIELD */}
      <LabelInputContainer>
        <Label
          htmlFor="content"
          className="text-foreground font-medium text-base"
        >
          What are the details of your problem?
          <span className="block text-xs font-normal text-muted-foreground mt-1">
            Introduce the problem and expand on what you put in the title.
            Minimum 20 characters.
          </span>
        </Label>
        <div className="mt-2 rounded-lg border border-border bg-background p-1">
          <RTE
            value={formData.content}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, content: value || "" }))
            }
          />
        </div>
      </LabelInputContainer>

      {/* IMAGE FIELD */}
      <LabelInputContainer>
        <Label htmlFor="image" className="text-foreground font-medium text-base">
          Image
          <span className="block text-xs font-normal text-muted-foreground mt-1">
            Add an image to your question to make it clearer and easier to
            understand.
          </span>
        </Label>
        <Input
          id="image"
          name="image"
          type="file"
          accept="image/*"
          className="mt-2"
          onChange={(e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;
            setFormData((prev) => ({
              ...prev,
              attachment: files[0],
            }));
          }}
        />
      </LabelInputContainer>

      {/* TAGS FIELD */}
      <LabelInputContainer>
        <Label htmlFor="tag" className="text-foreground font-medium text-base">
          Tags
          <span className="block text-xs font-normal text-muted-foreground mt-1">
            Add tags to describe what your question is about. Start typing to
            see suggestions.
          </span>
        </Label>
        <div className="flex w-full gap-4 mt-2">
          <div className="w-full">
            <Input
              id="tag"
              name="tag"
              placeholder="e.g. (java c objective-c)"
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            />
          </div>
          <button
            className="relative shrink-0 rounded-full border border-border bg-secondary px-8 py-2 text-sm text-secondary-foreground transition duration-200 hover:shadow-2xl"
            type="button"
            onClick={() => {
              if (tag.trim().length === 0) return;
              setFormData((prev) => ({
                ...prev,
                tags: new Set([...Array.from(prev.tags), tag.trim()]),
              }));
              setTag("");
            }}
          >
            <div className="absolute inset-x-0 -top-px mx-auto h-px w-1/2 bg-gradient-to-r from-transparent via-teal-500 to-transparent shadow-2xl" />
            <span className="relative z-20">Add</span>
          </button>
        </div>

        {/* Selected Tags Display */}
        <div className="flex flex-wrap gap-2 mt-3">
          {Array.from(formData.tags).map((tagItem, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="group relative inline-block rounded-full bg-secondary p-px text-xs font-semibold leading-6 text-secondary-foreground no-underline shadow-2xl shadow-zinc-900">
                <span className="absolute inset-0 overflow-hidden rounded-full">
                  <span className="absolute inset-0 rounded-full bg-[image:radial-gradient(75%_100%_at_50%_0%,rgba(56,189,248,0.6)_0%,rgba(56,189,248,0)_75%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                </span>
                <div className="relative z-10 flex items-center space-x-2 rounded-full bg-background px-4 py-0.5 ring-1 ring-border">
                  <span>{tagItem}</span>
                  <button
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        tags: new Set(
                          Array.from(prev.tags).filter((t) => t !== tagItem),
                        ),
                      }));
                    }}
                    type="button"
                  >
                    <IconX size={12} />
                  </button>
                </div>
                <span className="absolute -bottom-0 left-[1.125rem] h-px w-[calc(100%-2.25rem)] bg-gradient-to-r from-emerald-400/0 via-emerald-400/90 to-emerald-400/0 transition-opacity duration-500 group-hover:opacity-40" />
              </div>
            </div>
          ))}
        </div>
      </LabelInputContainer>

      {/* SUBMIT BUTTON */}
      <button
        className="inline-flex h-12 animate-shimmer items-center justify-center rounded-md border border-border bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] px-6 font-medium text-muted-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50"
        type="submit"
        disabled={loading}
      >
        {loading ? "Processing..." : question ? "Update" : "Publish"}
      </button>
    </form>
  );
};

export default QuestionForm;
