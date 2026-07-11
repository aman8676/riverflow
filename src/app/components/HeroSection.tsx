import React from "react";
import { HeroParallax } from "@/components/ui/hero-parallax";
import { databases } from "@/models/server/config";
import {
  db,
  questionAttachmentBucket,
  questionCollection,
} from "@/models/name";
import { Query } from "node-appwrite";
import slugify from "slugify";
import HeroSectionHeader from "./HeroSectionHeader";

const FALLBACK_IMAGE = "/placeholder.svg";

function getFilePreviewUrl(bucketId: string, fileId: string): string {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  return `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`;
}
export default async function HeroSection() {
  const questions = await databases.listDocuments(db, questionCollection, [
    Query.orderDesc("$createdAt"),
    Query.limit(15),
  ]);

  return (
    // <HeroParallax
    //   header={<HeroSectionHeader />}
    //   products={questions.documents.map((q) => ({
    //     title: q.title,
    //     link: `/questions/${q.$id}/${slugify(q.title)}`,
    //     thumbnail: q.attachmentId
    //       ? getFilePreviewUrl(questionAttachmentBucket, q.attachmentId)
    //       : FALLBACK_IMAGE,
    //   }))}
    // />
    <HeroSectionHeader />
  );
}
