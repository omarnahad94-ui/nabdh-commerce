import { Client } from "@replit/object-storage";

const storage = new Client({
  bucketId: "replit-objstore-b0262534-3ecb-4211-9ba6-3e0624fad1e8",
});

export async function uploadProductImage(
  objectName: string,
  contents: Buffer,
) {
  const result = await storage.uploadFromBytes(objectName, contents);

  if (!result.ok) {
    throw new Error("فشل رفع صورة المنتج إلى التخزين");
  }

  return result;
}

export async function downloadProductImage(objectName: string) {
  return storage.downloadAsBytes(objectName);
}
