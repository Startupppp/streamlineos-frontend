"use client";

import {
  useExternalReferrers,
  useUpdateExternalReferrerStatus,
} from "@/hooks/api/hr/recruitment/external-referrals";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetBody,
} from "@/components/ui/sheet";
import { RecruitmentEmptyState } from "@/features/recruitment/components/recruitment-empty-state";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Users2 } from "lucide-react";
import { TruncatedText } from "@/components/ui/truncated-text";

function ReferrerRow({ id, name, email, status, referralCount }: { id: number; name: string; email: string; status: "ACTIVE" | "BLOCKED"; referralCount: number }) {
  const updateStatus = useUpdateExternalReferrerStatus(id);

  const handleToggle = async () => {
    try {
      await updateStatus.mutateAsync(status === "ACTIVE" ? "BLOCKED" : "ACTIVE");
      toast.success(status === "ACTIVE" ? "Referrer blocked" : "Referrer unblocked");
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
      <div className="min-w-0">
        <TruncatedText text={name} className="text-sm font-medium text-foreground" />
        <TruncatedText text={`${email} · ${referralCount} referral${referralCount === 1 ? "" : "s"}`} className="text-dense text-muted-foreground" />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={status === "ACTIVE" ? "secondary" : "destructive"} className="text-micro">{status}</Badge>
        <LoadingButton variant="outline" size="sm" className="text-xs" onClick={handleToggle} isPending={updateStatus.isPending} loadingText={status === "ACTIVE" ? "Blocking…" : "Unblocking…"}>
          {status === "ACTIVE" ? "Block" : "Unblock"}
        </LoadingButton>
      </div>
    </div>
  );
}

export function ManageReferrersSheet() {
  const { data: referrers = [], isLoading, isError, error, refetch } = useExternalReferrers();

  function handleRetry(): void {
    void refetch();
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Users2 className="h-3.5 w-3.5" />
          Manage Referrers
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>External Referrers</SheetTitle>
          <SheetDescription>Everyone who has registered a referral link, with fraud controls.</SheetDescription>
        </SheetHeader>
        <SheetBody className="px-6 py-4 space-y-2">
          {isLoading ? (
            Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)
          ) : isError ? (
            <ErrorState
              compact
              className="border-0 bg-transparent shadow-none"
              title="Couldn't load external referrers"
              description={getErrorMessage(error)}
              onRetry={handleRetry}
            />
          ) : referrers.length === 0 ? (
            <RecruitmentEmptyState
              illustration={<EmptyTeamIllustration />}
              title="No external referrers yet"
              description="Registered referral partners will appear here."
              compact
              className="border-0 bg-transparent shadow-none"
            />
          ) : (
            referrers.map((r) => <ReferrerRow key={r.id} id={r.id} name={r.name} email={r.email} status={r.status} referralCount={r.referralCount} />)
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
