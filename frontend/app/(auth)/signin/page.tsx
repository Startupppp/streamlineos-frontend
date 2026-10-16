import { SignInPageClient } from "./signin-page-client";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SignInPage({ searchParams }: PageProps) {
  const hasGoogle = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
  const params = await searchParams;
  const errorParam =
    typeof params.error === "string" ? params.error : undefined;
  const sessionParam =
    typeof params.session === "string" ? params.session : undefined;
  const emailParam =
    typeof params.email === "string" ? params.email : undefined;
  return (
    <SignInPageClient
      hasGoogle={hasGoogle}
      errorParam={errorParam}
      emailParam={emailParam}
      sessionParam={sessionParam}
    />
  );
}
