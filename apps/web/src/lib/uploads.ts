import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

export type UploadResult = { url: string; error?: undefined } | { url?: undefined; error: string };

function extFromType(type: string): string {
  switch (type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

function cloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

async function uploadToCloudinary(file: File, buffer: Buffer): Promise<UploadResult> {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "grocery";

  const signatureBase = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha1").update(signatureBase).digest("hex");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)], { type: file.type }), file.name);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { error: `Cloudinary upload failed (${res.status}). ${detail.slice(0, 180)}` };
  }

  const data = (await res.json()) as { secure_url?: string };
  if (!data.secure_url) return { error: "Cloudinary did not return a URL." };
  return { url: data.secure_url };
}

async function uploadToDisk(file: File, buffer: Buffer): Promise<UploadResult> {
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });

  const ext = extFromType(file.type);
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);

  return { url: `/uploads/${filename}` };
}

/** Persist an uploaded image, using Cloudinary when configured, else local disk. */
export async function saveUpload(file: File): Promise<UploadResult> {
  if (!ALLOWED.has(file.type)) {
    return { error: "Unsupported image type. Use JPG, PNG, WEBP, AVIF or GIF." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Image is too large. Maximum size is 5 MB." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    return cloudinaryConfigured()
      ? await uploadToCloudinary(file, buffer)
      : await uploadToDisk(file, buffer);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }
}
