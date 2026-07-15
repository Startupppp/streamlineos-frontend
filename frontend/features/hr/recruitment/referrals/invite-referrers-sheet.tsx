"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetBody,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { Share2, Copy } from "lucide-react";

export function InviteReferrersSheet() {
  const { data: session } = useSession();
  const orgId = session?.orgId as string | null | undefined;
  const [copied, setCopied] = useState(false);

  const link = typeof window !== "undefined" && orgId ? `${window.location.origin}/refer/${orgId}` : "";

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Share2 className="h-3.5 w-3.5" />
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
            <Button variant="outline" size="icon" className="shrink-0" onClick={handleCopy}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          {copied && <p className="text-xs text-green-600">Copied to clipboard.</p>}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
