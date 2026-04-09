"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useMemo } from "react";
import {
  useBackgroundVerifications, useCreateBackgroundVerification, useUpdateBackgroundVerification,
  type BackgroundVerification,
} from "@/lib/api/hooks/hr";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, ShieldCheck, Clock, CheckCircle2, XCircle } from "lucide-react";
import type { Employee } from "@/types/hr";
import Image from "next/image";

const BGV_TYPES = ["Identity", "Education", "Employment", "Criminal", "Address", "Credit"];

function statusBadge(s: string | null): "default" | "secondary" | "outline" | "destructive" {
  if (s === "CLEAR") return "default";
  if (s === "IN_PROGRESS") return "secondary";
  if (s === "FLAGGED") return "destructive";
  return "outline";
}

function BGVContent() {
  const { data: items, isLoading } = useBackgroundVerifications();
  const { data: employeesRaw } = useHrEmployees();
  const create = useCreateBackgroundVerification();
  const update = useUpdateBackgroundVerification();

  const employees = useMemo(
    () => (Array.isArray(employeesRaw) ? employeesRaw : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[],
    [employeesRaw],
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [type, setType] = useState("Identity");
  const [provider, setProvider] = useState("");
  const [refNumber, setRefNumber] = useState("");
  const [notes, setNotes] = useState("");

  const handleCreate = useCallback(() => {
    if (!userId) { toast.error("Employee is required"); return; }
    create.mutate(
      { userId, type, provider: provider || undefined, referenceNumber: refNumber || undefined, notes: notes || undefined },
      {
        onSuccess: () => {
          toast.success("Verification initiated");
          setSheetOpen(false); setUserId(""); setType("Identity"); setProvider(""); setRefNumber(""); setNotes("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [userId, type, provider, refNumber, notes, create]);

  const handleUpdateStatus = useCallback((id: number, status: string) => {
    update.mutate({ id, status }, {
      onSuccess: () => toast.success("Status updated"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [update]);

  if (isLoading) {
    return (
      <PageWrapper title="Background Verification" subtitle="BGV tracking for employees">
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Background Verification"
      subtitle="Initiate and track employee background checks"
      badge={`${items?.length ?? 0} checks`}
      actions={<Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Initiate BGV</Button>}
    >
      {!items?.length ? (
        <Card><CardContent className="py-12 text-center">
          <ShieldCheck className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
          <Image
              src="/illustrations/undraw-online-survey.svg"
              alt="Empty state illustration"
              width={200}
              height={160}
              className="mx-auto mb-4 opacity-90"
            />
            <p className="text-sm text-muted-foreground">No background verifications initiated.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((bgv: BackgroundVerification) => (
            <Card key={bgv.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{bgv.user?.name ?? "Employee"}</p>
                    <Badge variant="outline" className="text-[10px]">{bgv.type}</Badge>
                    <Badge variant={statusBadge(bgv.status)} className="text-[10px]">{bgv.status ?? "PENDING"}</Badge>
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                    {bgv.provider && <span>Provider: {bgv.provider}</span>}
                    {bgv.referenceNumber && <span>Ref: {bgv.referenceNumber}</span>}
                    {bgv.createdAt && <span>{format(new Date(bgv.createdAt), "MMM d, yyyy")}</span>}
                  </div>
                </div>
                {(!bgv.status || bgv.status === "IN_PROGRESS") && (
                  <div className="flex gap-1.5 shrink-0">
                    <Button size="sm" className="h-7 text-xs" onClick={() => handleUpdateStatus(bgv.id, "CLEAR")} disabled={update.isPending}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />Clear
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleUpdateStatus(bgv.id, "FLAGGED")} disabled={update.isPending}>
                      <XCircle className="h-3 w-3 mr-1" />Flag
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Initiate BGV" onSubmit={handleCreate} submitLabel="Initiate" isPending={create.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee</label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
            <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name ?? e.email}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Verification Type</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{BGV_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Provider</label>
          <Input placeholder="e.g., AuthBridge" value={provider} onChange={(e) => setProvider(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Reference Number</label>
          <Input placeholder="Tracking reference" value={refNumber} onChange={(e) => setRefNumber(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes</label>
          <Textarea placeholder="Additional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
      </HrSheet>
    </PageWrapper>
  );
}

export default function BackgroundVerificationPage() {
  return (
    <DashboardGate allowedRoles={["HR"]}>
      <BGVContent />
    </DashboardGate>
  );
}
