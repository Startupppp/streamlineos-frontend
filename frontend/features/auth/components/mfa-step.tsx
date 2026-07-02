"use client";

import type { ChangeEvent, KeyboardEvent } from "react";
import { ShieldCheck, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface MfaStepProps {
  code: string;
  onCodeChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  onBack: () => void;
  isPending: boolean;
  error: string | null;
}

export function MfaStep({
  code,
  onCodeChange,
  onKeyDown,
  onSubmit,
  onBack,
  isPending,
  error,
}: MfaStepProps) {
  return (
    <div className="w-full max-w-sm animate-fade-up">
      <div className="mb-5 sm:mb-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950">
          <ShieldCheck className="h-6 w-6 text-blue-600" />
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          Two-factor authentication
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app
        </p>
      </div>

      <div className="rounded-xl p-4 sm:p-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="totp-code" className="text-[13px] font-medium">
            Authentication code
          </Label>
          <Input
            id="totp-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            value={code}
            onChange={onCodeChange}
            onKeyDown={onKeyDown}
            disabled={isPending}
            className={cn(
              "h-9 text-sm text-center tracking-[0.4em] font-mono",
              error && "border-destructive focus-visible:ring-destructive/30",
            )}
            autoFocus
          />
          {error && (
            <p role="alert" className="text-[12px] text-destructive">
              {error}
            </p>
          )}
        </div>

        <Button
          type="button"
          disabled={isPending || code.length !== 6}
          className="w-full h-9 text-sm font-medium gap-2"
          onClick={onSubmit}
        >
          {isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Verifying…
            </>
          ) : (
            <>
              Verify and sign in
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </Button>

        <button
          type="button"
          onClick={onBack}
          className="block w-full text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Back to sign in
        </button>
      </div>
    </div>
  );
}
