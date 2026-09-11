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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusIcon, GlobeIcon } from "@animateicons/react/lucide";
import { StateIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
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

function WorkAuthStatusBadge({ status }: { status: WorkAuthorization["status"] }) {
  if (status === "expired") return <Badge className="bg-status-danger-surface text-status-danger-ink border-status-danger-rule">Expired</Badge>;
  if (status === "expiring") return <Badge className="bg-status-warning-surface text-status-warning-ink border-status-warning-rule">Expiring</Badge>;
  if (status === "pending_renewal") return <Badge className="bg-status-info-surface text-status-info-ink border-status-info-rule">Pending renewal</Badge>;
  return <Badge className="bg-status-success-surface text-status-success-ink border-status-success-rule">Active</Badge>;
}

export function CompliancePageContent() {
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

  return (
    <PageWrapper
      title="Compliance"
      subtitle="Manage labor law requirements, work authorizations, and compliance calendars."
      actions={
        <Button size="sm" onClick={handleOpenNewReq} className="gap-1.5 h-8">
          <PlusIcon size={14} />
          Add requirement
        </Button>
      }
    >
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="work-auth">Work Authorizations</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-0">
          <div className="flex justify-end gap-2 mb-4">
            <LoadingButton
              variant="outline"
              size="sm"
              isPending={generateEvents.isPending}
              onClick={() => generateEvents.mutate(undefined)}
              className="text-xs"
            >
              Generate events (next 12 months)
            </LoadingButton>
          </div>
          <ComplianceEventsTab />
        </TabsContent>

        <TabsContent value="requirements" className="mt-0">
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
                onClick={() => setSeedDialogOpen(true)}
                className="text-xs gap-1.5"
              >
                <GlobeIcon size={12} />
                Seed country pack
              </LoadingButton>
            </div>
          </div>

          {reqLoading ? (
            <div className="space-y-2">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
          ) : reqIsError ? (
            <ErrorState
              className="flex-1"
              title="Couldn't load compliance requirements"
              description={getErrorMessage(reqError)}
              onRetry={handleRetryRequirements}
            />
          ) : (reqData?.data ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <StateIllustration preset="security" className="h-28 w-28" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">No compliance requirements</p>
                <p className="text-xs text-muted-foreground">Add a requirement manually or seed a country compliance pack.</p>
              </div>
              <Button size="sm" onClick={handleOpenNewReq} className="mt-1 gap-1.5 h-8">
                <PlusIcon size={14} />
                Add requirement
              </Button>
            </div>
          ) : (
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
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleOpenEditReq(req)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive" onClick={() => setDeleteReqId(req.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="work-auth" className="mt-0">
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={handleOpenNewAuth} className="gap-1.5 h-8">
              <PlusIcon size={14} />
              Add authorization
            </Button>
          </div>

          {authLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
          ) : authIsError ? (
            <ErrorState
              className="flex-1"
              title="Couldn't load work authorizations"
              description={getErrorMessage(authError)}
              onRetry={handleRetryWorkAuth}
            />
          ) : (authData?.data ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <StateIllustration preset="security" className="h-28 w-28" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">No work authorizations on record</p>
                <p className="text-xs text-muted-foreground">Track visa, work permit, and right-to-work documentation for employees.</p>
              </div>
              <Button size="sm" onClick={handleOpenNewAuth} className="mt-1 gap-1.5 h-8">
                <PlusIcon size={14} />
                Add authorization
              </Button>
            </div>
          ) : (
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
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleOpenEditAuth(auth)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive" onClick={() => setDeleteAuthId(auth.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
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

      <AlertDialog open={deleteReqId !== null} onOpenChange={(v) => { if (!v) setDeleteReqId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete requirement?</AlertDialogTitle>
            <AlertDialogDescription>This will delete the compliance requirement and all associated events.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteRequirement}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAuthId !== null} onOpenChange={(v) => { if (!v) setDeleteAuthId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete work authorization?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteAuth}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={seedDialogOpen} onOpenChange={setSeedDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Seed {seedCountry} country pack?</AlertDialogTitle>
            <AlertDialogDescription>
              This will add default holidays and compliance requirements for {seedCountry}. Existing records will not be duplicated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSeedPack}
            >
              Seed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
