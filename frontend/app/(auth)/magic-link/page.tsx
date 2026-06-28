"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function MagicLinkPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;

    async function verify() {
      const result = await signIn("credentials", {
        magicToken: token,
        redirect: false,
      });

      if (result?.ok) {
        router.replace("/dashboard");
      } else {
        setErrorMessage("This link is invalid, expired, or has already been used. Please request a new one.");
        setStatus("error");
      }
    }

    verify();
  }, [token, router]);

  if (status === "error") {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <XCircle className="h-7 w-7 text-destructive" />
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
