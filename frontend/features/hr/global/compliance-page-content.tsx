"use client";

import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusIcon, GlobeIcon } from "@animateicons/react/lucide";
import { StateIllustration } from "@/components/illustrations";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import {
  useComplianceRequirements,
  useDeleteComplianceRequirement,
  useGenerateComplianceEvents,
  useSeedCountryPack,
  useWorkAuthorizations,
  useDeleteWorkAuth,
  type ComplianceRequirement,
  type WorkAuthorization,
} from "@/hooks/api/hr/global";
import { ComplianceEventsTab } from "./compliance-events-tab";
import { ComplianceRequirementSheet } from "./compliance-requirement-sheet";
import { WorkAuthSheet } from "./work-auth-sheet";
import { TruncatedText } from "@/components/ui/truncated-text";

const COUNTRY_PACKS: Record<string, { label: string; summary: string }> = {
  IN: {
    label: "India",
    summary:
      "Adds the PF, ESI, Professional Tax and TDS filing calendar plus India's public holidays.",
  },
  GENERIC: {
    label: "Generic",
    summary:
      "Adds a starter set of filing and posting requirements you can rename to match your jurisdiction.",
  },
};

function packFor(country: string): { label: string; summary: string } {
  return (
    COUNTRY_PACKS[country] ?? {
      label: country,
      summary: "Adds default holidays and compliance requirements.",
    }
  );
}

function WorkAuthStatusBadge({ status }: { status: WorkAuthorization["status"] }) {
  if (status === "expired") return <Badge className="bg-status-danger-surface text-status-danger-ink border-status-danger-rule">Expired</Badge>;
  if (status === "expiring") return <Badge className="bg-status-warning-surface text-status-warning-ink border-status-warning-rule">Expiring</Badge>;
  if (status === "pending_renewal") return <Badge className="bg-status-info-surface text-status-info-ink border-status-info-rule">Pending renewal</Badge>;
  return <Badge className="bg-status-success-surface text-status-success-ink border-status-success-rule">Active</Badge>;
}

export function CompliancePageContent() {
  const canManage = useCan("hr:compliance:manage");
  const [reqSheetOpen, setReqSheetOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<ComplianceRequirement | undefined>(undefined);
  const [authSheetOpen, setAuthSheetOpen] = useState(false);
  const [editingAuth, setEditingAuth] = useState<WorkAuthorization | undefined>(undefined);
  const [deleteReqId, setDeleteReqId] = useState<number | null>(null);
  const [deleteAuthId, setDeleteAuthId] = useState<number | null>(null);
  const [seedCountry, setSeedCountry] = useState("IN");
  const [seedDialogOpen, setSeedDialogOpen] = useState(false);

  const {
    data: reqData,
    isLoading: reqLoading,
    isError: reqIsError,
    error: reqError,
    refetch: refetchRequirements,
  } = useComplianceRequirements();
  const {
    data: authData,
    isLoading: authLoading,
    isError: authIsError,
    error: authError,
    refetch: refetchWorkAuth,
  } = useWorkAuthorizations();
  const deleteReq = useDeleteComplianceRequirement();
  const deleteAuth = useDeleteWorkAuth();
  const generateEvents = useGenerateComplianceEvents();
  const seedPack = useSeedCountryPack();

  const handleRetryRequirements = useCallback(() => {
    void refetchRequirements();
  }, [refetchRequirements]);

  const handleRetryWorkAuth = useCallback(() => {
    void refetchWorkAuth();
  }, [refetchWorkAuth]);

  const handleOpenEditReq = useCallback((req: ComplianceRequirement) => {
    setEditingReq(req);
    setReqSheetOpen(true);
  }, []);

  const handleOpenEditAuth = useCallback((auth: WorkAuthorization) => {
    setEditingAuth(auth);
    setAuthSheetOpen(true);
  }, []);

  function handleOpenNewReq() {
    setEditingReq(undefined);
    setReqSheetOpen(true);
  }

  function handleOpenNewAuth() {
    setEditingAuth(undefined);
    setAuthSheetOpen(true);
  }

  function handleDeleteRequirement() {
    if (!deleteReqId) return;
    deleteReq.mutate(deleteReqId, { onSuccess: () => setDeleteReqId(null) });
  }

  function handleDeleteAuth() {
    if (!deleteAuthId) return;
    deleteAuth.mutate(deleteAuthId, { onSuccess: () => setDeleteAuthId(null) });
  }

  function handleSeedPack() {
    seedPack.mutate({ country: seedCountry }, { onSuccess: () => setSeedDialogOpen(false) });
  }

  const handleOpenSeedDialog = useCallback(() => setSeedDialogOpen(true), []);
  const handleGenerateEvents = useCallback(() => generateEvents.mutate(undefined), [generateEvents]);
  const handleDeleteReqDialogChange = useCallback((open: boolean) => { if (!open) setDeleteReqId(null); }, []);
  const handleDeleteAuthDialogChange = useCallback((open: boolean) => { if (!open) setDeleteAuthId(null); }, []);

  const requirementsState = usePageState({
    permission: "hr:compliance:manage",
    isLoading: reqLoading,
    isError: reqIsError,
    error: reqError,
    isEmpty: (reqData?.data ?? []).length === 0,
  });
  // Listing work authorizations needs hr:employees:view, not the compliance key
  // this page is gated on — a compliance manager without it was told "No work
  // authorizations on record" (FE-47).
  const workAuthState = usePageState({
    permission: "hr:employees:view",
    isLoading: authLoading,
    isError: authIsError,
    error: authError,
    isEmpty: (authData?.data ?? []).length === 0,
  });

  const selectedPack = packFor(seedCountry);

  return (
    <PageWrapper
      title="Compliance"
      subtitle="Manage labor law requirements, work authorizations, and compliance calendars."
      actions={
        canManage ? (
          <Button size="sm" onClick={handleOpenNewReq} className="gap-1.5">
            <PlusIcon size={14} />
            Add requirement
          </Button>
        ) : null
      }
    >
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="work-auth">Work Authorizations</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-0">
          {canManage ? (
            <div className="flex justify-end gap-2 mb-4">
              <LoadingButton
                variant="outline"
                size="sm"
                isPending={generateEvents.isPending}
                onClick={handleGenerateEvents}
              >
                Generate events (next 12 months)
              </LoadingButton>
            </div>
          ) : null}
          <ComplianceEventsTab />
        </TabsContent>

        <TabsContent value="requirements" className="mt-0">
          {canManage ? (
          <div className="flex justify-end gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Select value={seedCountry} onValueChange={setSeedCountry}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">India (IN)</SelectItem>
                  <SelectItem value="GENERIC">Generic</SelectItem>
                </SelectContent>
              </Select>
              <LoadingButton
                variant="outline"
                size="sm"
                isPending={seedPack.isPending}
                onClick={handleOpenSeedDialog}
                className="gap-1.5"
              >
                <GlobeIcon size={12} />
                Set up {selectedPack.label} compliance
              </LoadingButton>
            </div>
          </div>
          ) : null}

          <PageState
            resolution={requirementsState}
            loading={<div className="space-y-2">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>}
            onRetry={handleRetryRequirements}
            empty={
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <StateIllustration preset="security" className="h-28 w-28" />
              <div className="max-w-sm space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Nothing is being tracked yet
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedPack.summary} Start from it, then edit or add your own.
                </p>
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                {canManage ? (
                  <>
                    <LoadingButton
                      size="sm"
                      isPending={seedPack.isPending}
                      onClick={handleOpenSeedDialog}
                      className="gap-1.5"
                    >
                      <GlobeIcon size={14} />
                      Set up {selectedPack.label} compliance
                    </LoadingButton>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenNewReq}
                      className="gap-1.5"
                    >
                      <PlusIcon size={14} />
                      Add requirement
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
            }
          >
            <div className="space-y-2">
              {(reqData?.data ?? []).map((req) => (
                <div key={req.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <div className="flex-1 min-w-0">
                    <TruncatedText text={req.name} className="text-sm font-medium" />
                    <p className="text-xs text-muted-foreground capitalize">
                      {req.frequency} · {req.category.replace(/_/g, " ")}
                      {req.countryCode && ` · ${req.countryCode}`}
                    </p>
                  </div>
                  <Badge variant={req.active ? "secondary" : "outline"} className="text-xs">
                    {req.active ? "Active" : "Inactive"}
                  </Badge>
                  {canManage ? (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEditReq(req)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteReqId(req.id)}>Delete</Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </PageState>
        </TabsContent>

        <TabsContent value="work-auth" className="mt-0">
          {canManage && workAuthState.kind !== "denied" ? (
            <div className="flex justify-end mb-4">
              <Button size="sm" onClick={handleOpenNewAuth} className="gap-1.5">
                <PlusIcon size={14} />
                Add authorization
              </Button>
            </div>
          ) : null}

          <PageState
            resolution={workAuthState}
            loading={<div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>}
            onRetry={handleRetryWorkAuth}
            empty={
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <StateIllustration preset="security" className="h-28 w-28" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">No work authorizations on record</p>
                <p className="text-xs text-muted-foreground">Track visa, work permit, and right-to-work documentation for employees.</p>
              </div>
              {canManage ? (
                <Button size="sm" onClick={handleOpenNewAuth} className="mt-1 gap-1.5">
                  <PlusIcon size={14} />
                  Add authorization
                </Button>
              ) : null}
            </div>
            }
          >
            <div className="space-y-2">
              {(authData?.data ?? []).map((auth) => (
                <div key={auth.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <div className="flex-1 min-w-0">
                    <TruncatedText text={`${auth.authType.replace(/_/g, " ")} · ${auth.countryCode}`} className="text-sm font-medium capitalize" />
                    <p className="text-xs text-muted-foreground font-mono">
                      {auth.documentNumberMasked ? `••••${auth.documentNumberMasked}` : "No document ref"}
                      {auth.validUntil && ` · Exp: ${auth.validUntil}`}
                    </p>
                  </div>
                  <WorkAuthStatusBadge status={auth.status} />
                  {canManage ? (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEditAuth(auth)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteAuthId(auth.id)}>Delete</Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </PageState>
        </TabsContent>
      </Tabs>

      <ComplianceRequirementSheet
        open={reqSheetOpen}
        onOpenChange={(v) => { setReqSheetOpen(v); if (!v) setEditingReq(undefined); }}
        existing={editingReq}
      />
      <WorkAuthSheet
        open={authSheetOpen}
        onOpenChange={(v) => { setAuthSheetOpen(v); if (!v) setEditingAuth(undefined); }}
        existing={editingAuth}
      />

      <ConfirmDialog
        open={deleteReqId !== null}
        onOpenChange={handleDeleteReqDialogChange}
        title="Delete requirement?"
        description="This will delete the compliance requirement and all associated events."
        confirmLabel="Delete"
        destructive
        isPending={deleteReq.isPending}
        keepOpenOnConfirm
        onConfirm={handleDeleteRequirement}
      />

      <ConfirmDialog
        open={deleteAuthId !== null}
        onOpenChange={handleDeleteAuthDialogChange}
        title="Delete work authorization?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        isPending={deleteAuth.isPending}
        keepOpenOnConfirm
        onConfirm={handleDeleteAuth}
      />

      <ConfirmDialog
        open={seedDialogOpen}
        onOpenChange={setSeedDialogOpen}
        title={`Set up ${selectedPack.label} compliance?`}
        description={`${selectedPack.summary} Anything you already track is left alone, and every item stays editable afterwards.`}
        confirmLabel={`Set up ${selectedPack.label} compliance`}
        isPending={seedPack.isPending}
        keepOpenOnConfirm
        onConfirm={handleSeedPack}
      />
    </PageWrapper>
  );
}
