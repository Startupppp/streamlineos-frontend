import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET(): NextResponse<{ commitSha: string | null }> {
  const commitSha =
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.NEXT_PUBLIC_APP_VERSION?.trim() ||
    null;

  return NextResponse.json(
    { commitSha },
    { headers: { "Cache-Control": "no-store" } },
  );
}
