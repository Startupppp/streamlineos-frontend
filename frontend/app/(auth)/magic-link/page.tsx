"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithMagicToken } from "@/hooks/common/auth-hooks";
import { Loader2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

type MagicLinkStage = "loading" | "failed" | "indeterminate";

const MISSING_TOKEN_MESSAGE =
  "This link is missing its sign-in token. Please request a new one.";
const INVALID_TOKEN_MESSAGE =
  "This link is invalid, expired, or has already been used. Please request a new one.";
const INDETERMINATE_MESSAGE =
  "We could not confirm that you were signed in, so nothing was changed on this device. Request a fresh sign-in link and try again.";

export default function MagicLinkPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [stage, setStage] = useState<MagicLinkStage>(
    token ? "loading" : "failed",
  );
  const [errorMessage, setErrorMessage] = useState(
    token ? "" : MISSING_TOKEN_MESSAGE,
  );
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;

    async function verify() {
      const outcome = await signInWithMagicToken(token ?? "");
      if (outcome.status === "signed-in") {
        window.location.replace("/dashboard");
        return;
      }
      if (outcome.status === "indeterminate") {
        setErrorMessage(INDETERMINATE_MESSAGE);
        setStage("indeterminate");
        return;
      }
      setErrorMessage(INVALID_TOKEN_MESSAGE);
      setStage("failed");
    }

    verify();
  }, [token]);

  if (stage === "indeterminate") {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-status-warning-surface">
          <AlertTriangle
            className="w-7 text-status-warning-ink"
            aria-hidden="true"
          />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">
          Sign-in not confirmed
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
        <Button asChild className="mt-6 w-full">
          <Link href="/signin">Sign in again</Link>
        </Button>
      </div>
    );
  }

  if (stage === "failed") {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <XCircle className="w-7 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Link expired</h1>
        <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
        <Button asChild className="mt-6 w-full">
          <Link href="/signin">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm text-center">
      <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />
      <p className="mt-4 text-sm text-muted-foreground">Signing you in…</p>
    </div>
  );
}
