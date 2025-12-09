import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_REGION = process.env.R2_REGION || "auto";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ENDPOINT = process.env.R2_ENDPOINT;

if (!R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT) {
  console.warn("⚠️  R2 configuration is incomplete. File storage operations will fail.");
}

const S3 = new S3Client({
  region: R2_REGION,
  endpoint: R2_ENDPOINT,
  credentials: R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY ? {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  } : undefined,
});

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

export async function uploadFile(
  file: File | Buffer,
  folder: string = "uploads",
  fileName?: string
): Promise<UploadResult> {
  if (!R2_BUCKET_NAME) {
    throw new Error("R2 bucket not configured");
  }

  const buffer = Buffer.isBuffer(file) ? file : Buffer.from(await file.arrayBuffer());
  const originalName = Buffer.isBuffer(file) ? fileName ?? "file" : file.name;
  const mimeType = Buffer.isBuffer(file) ? "application/octet-stream" : file.type;
  
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, "-");
  const key = `${folder}/${Date.now()}-${sanitizedName}`;
  
  await S3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL
    ? `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`
    : key;

  return {
    url: publicUrl,
    key,
    size: buffer.length,
    mimeType,
  };
}

export async function getFileUrl(key: string, expiresIn: number = 3600): Promise<string> {
  if (!R2_BUCKET_NAME) {
    throw new Error("R2 bucket not configured");
  }

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(S3, command, { expiresIn });
}

export async function deleteFile(key: string): Promise<void> {
  if (!R2_BUCKET_NAME) {
    throw new Error("R2 bucket not configured");
  }

  await S3.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  );
}

export async function fileExists(key: string): Promise<boolean> {
  if (!R2_BUCKET_NAME) {
    return false;
  }

  try {
    await S3.send(
      new HeadObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

export function getFileKeyFromUrl(url: string): string {
  if (process.env.NEXT_PUBLIC_R2_PUBLIC_URL) {
    return url.replace(`${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/`, "");
  }
  return url;
}
