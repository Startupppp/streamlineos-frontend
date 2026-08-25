"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetBody,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { ShareIcon, CopyIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";

export function InviteReferrersSheet() {
  const { data: session } = useSession();
  const orgId = session?.orgId as string | null | undefined;
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { iconRef: shareIconRef, hoverHandlers: shareHoverHandlers } = useAnimatedIcon();

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current !== null) {
        clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  const link = typeof window !== "undefined" && orgId ? `${window.location.origin}/refer/${orgId}` : "";

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link copied");
    if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => {
      copiedTimerRef.current = null;
      setCopied(false);
    }, 2000);
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" className="gap-1.5" {...shareHoverHandlers}>
          <ShareIcon ref={shareIconRef} size={14} />
          Invite Referrers
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>External Referral Link</SheetTitle>
          <SheetDescription>
            Share this link with recruiters, alumni, or community members. Anyone who registers gets
            their own trackable referral link and can submit candidates for open roles.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-3 px-6 py-5">
          <div className="flex items-center gap-2">
            <Input readOnly value={link} className="text-xs" />
            <TooltipIconButton
              icon={CopyIcon}
              label="Copy link"
              variant="outline"
              className="shrink-0"
              onClick={handleCopy}
            />
          </div>
          {copied && <p className="text-xs text-status-success-ink">Copied to clipboard.</p>}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
