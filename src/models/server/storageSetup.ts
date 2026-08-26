import { Permission, Role } from "node-appwrite";
import { questionAttachmentBucket } from "../name";
import { storage } from "./config";

export default async function getOrCreateStorage() {
  try {
    await storage.getBucket(questionAttachmentBucket);
    console.log("Storage connected");
  } catch {
    try {
      await storage.createBucket(
        questionAttachmentBucket,
        questionAttachmentBucket,
        // Update/delete are granted per-file to the uploader only.
        [Permission.create(Role.users()), Permission.read(Role.any())],
        true, // fileSecurity
        undefined, // enabled
        undefined, // maximumFileSize
        ["jpg", "jpeg", "png", "gif", "bmp", "webp", "heic"],
      );
    } catch (error) {
      console.error("Error creating storage bucket:", error);
    }
  }
}
