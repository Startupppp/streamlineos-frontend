import * as dotenv from "dotenv";
import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  PutBucketCorsCommand,
  BucketAlreadyOwnedByYou,
  BucketAlreadyExists,
} from "@aws-sdk/client-s3";
import { loadR2Config, R2_FOLDERS, R2_FOLDER_PREFIXES } from "../lib/env";

dotenv.config({ path: ".env" });

const KEEP_FILE = ".keep";

const FOLDER_DESCRIPTIONS: Record<keyof typeof R2_FOLDERS, string> = {
  avatars: "User profile photos",
  orgLogos: "Organization logos and tenant branding",
  branding: "Site-wide branding assets (favicons, og images)",
  blog: "Blog post cover images and inline media",
  chatAttachments: "Team chat uploads (images, files, voice notes)",
  candidateResumes: "Recruitment CVs and resumes",
  candidatePhotos: "Candidate profile photos",
  candidateDocuments: "Candidate document vault (offer letters, IDs)",
  employeeDocuments: "Employee HR documents (contracts, certificates)",
  payslips: "Generated payslip PDFs",
  esign: "E-signed documents (Documenso integration)",
  qrCodes: "Generated QR code PNGs",
  exports: "Generated exports (CSV, Excel, PDF reports)",
  emailAttachments: "Outbound email attachments",
  temp: "Short-lived uploads (eligible for lifecycle expiration)",
};

function makeS3Client() {
  const cfg = loadR2Config();
  return {
    client: new S3Client({
      region: cfg.R2_REGION,
      endpoint: cfg.R2_ENDPOINT,
      credentials: {
        accessKeyId: cfg.R2_ACCESS_KEY_ID,
        secretAccessKey: cfg.R2_SECRET_ACCESS_KEY,
      },
    }),
    bucket: cfg.R2_BUCKET_NAME,
    appUrl: cfg.NEXT_PUBLIC_APP_URL,
  };
}

async function ensureBucket(client: S3Client, bucket: string): Promise<"created" | "exists"> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return "exists";
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
      ?.httpStatusCode;
    if (status && status !== 404 && status !== 403) throw error;
  }

  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    return "created";
  } catch (error) {
    if (error instanceof BucketAlreadyOwnedByYou || error instanceof BucketAlreadyExists) {
      return "exists";
    }
    throw error;
  }
}

async function seedFolder(
  client: S3Client,
  bucket: string,
  prefix: string,
  description: string,
): Promise<"created" | "exists"> {
  const key = `${prefix}${KEEP_FILE}`;
  const head = await client.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: key, MaxKeys: 1 }),
  );
  if (head.Contents && head.Contents.length > 0) return "exists";

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: `# ${description}\nThis placeholder keeps the "${prefix}" prefix visible in tooling.\n`,
      ContentType: "text/plain; charset=utf-8",
      Metadata: { purpose: "folder-marker", folder: prefix.replace(/\/$/, "") },
    }),
  );
  return "created";
}

async function applyCors(client: S3Client, bucket: string, appUrl?: string) {
  const origins = new Set<string>(["http://localhost:1000", "http://localhost:3000"]);
  if (appUrl) origins.add(appUrl.replace(/\/$/, ""));
  origins.add("https://streamlineos.in");
  origins.add("https://www.streamlineos.in");

  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: [...origins],
            AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
            AllowedHeaders: ["*"],
            ExposeHeaders: ["ETag", "Content-Length", "Content-Type"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }),
  );
}

async function main() {
  const { client, bucket, appUrl } = makeS3Client();

  console.log(`\nStreamlineOS · R2 bucket setup`);
  console.log(`──────────────────────────────`);
  console.log(`Bucket : ${bucket}`);
  console.log();

  const bucketResult = await ensureBucket(client, bucket);
  console.log(`[bucket]  ${bucketResult === "created" ? "created" : "exists "}  ${bucket}`);

  console.log(`\nSeeding folder prefixes:`);
  const entries = Object.entries(R2_FOLDERS) as [keyof typeof R2_FOLDERS, string][];
  for (const [key, prefix] of entries) {
    const description = FOLDER_DESCRIPTIONS[key];
    const result = await seedFolder(client, bucket, prefix, description);
    const status = result === "created" ? "created" : "exists ";
    console.log(`  [${status}] ${prefix.padEnd(28)} · ${description}`);
  }

  console.log(`\nApplying CORS policy...`);
  try {
    await applyCors(client, bucket, appUrl);
    console.log(`  [ok] CORS configured for app + localhost origins`);
  } catch (error) {
    console.log(`  [warn] CORS update skipped: ${(error as Error).message}`);
  }

  console.log(`\nDone. ${R2_FOLDER_PREFIXES.length} prefixes ready under "${bucket}".\n`);
}

main().catch((error) => {
  console.error(`\n[setup-r2] Failed:`);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
