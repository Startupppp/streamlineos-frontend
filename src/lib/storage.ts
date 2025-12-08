import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

const S3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadFile(file: File, folder: string = "uploads"): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${folder}/${Date.now()}-${file.name.replace(/\s/g, "-")}`;
    
    await S3.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
    }));

    // Construct public URL (assuming public access or custom domain setup)
    // If bucket is private, we'd need a presigned GET url or a worker proxy.
    // For now, assuming R2 dev URL or public bucket.
    // simpler: return the key, let UI generate presigned URL if unsafe.
    
    // Returning a simplified Public URL (User needs to configure R2 Public Access or Worker)
    return `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${fileName}`;
}
