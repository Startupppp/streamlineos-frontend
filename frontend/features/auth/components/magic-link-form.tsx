"use client";

import type { ChangeEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MagicLinkFormProps {
  isVisible: boolean;
  isSent: boolean;
  email: string;
  onEmailChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSend: () => void;
  isPending: boolean;
  onShow: () => void;
}

export function MagicLinkForm({
  isVisible,
  isSent,
  email,
  onEmailChange,
  onSend,
  isPending,
  onShow,
}: MagicLinkFormProps) {
  return (
    <div className="text-center">
      {!isVisible ? (
        <button
          type="button"
          onClick={onShow}
          className="text-[12px] text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
        >
          Email me a sign-in link instead
        </button>
      ) : isSent ? (
        <p className="text-[12px] text-green-700">
          Check your inbox — a sign-in link is on its way.
        </p>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={onEmailChange}
            className="h-8 text-sm"
            autoFocus
          />
          <Button
            type="button"
            size="sm"
            className="h-8 shrink-0"
            disabled={!email || isPending}
            onClick={onSend}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Send"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
