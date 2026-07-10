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
        [
          Permission.create(Role.users()),
          Permission.read(Role.any()),
          Permission.update(Role.users()),
          Permission.delete(Role.users()),
        ],
        false,
        undefined,
        undefined,
        ["jpg", "jpeg", "png", "gif", "bmp", "webp", "heic"],
      );
    } catch (error) {
      console.error("Error creating storage bucket:", error);
    }
  }
}
