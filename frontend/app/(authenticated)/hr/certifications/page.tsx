"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { useState, useCallback, useMemo } from "react";
import { useCertifications, useCreateCertification, type Certification } from "@/hooks/api/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { Plus, Award, Calendar, ExternalLink, AlertTriangle, CheckCircle2, XCircle, User, AlertCircle } from "lucide-react";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import {
  clearEndIfInvalid,
  planningEndPickerProps,
  parseDateOnly,
} from "@/lib/date-constraints";

type CertStatus = "VALID" | "EXPIRING_SOON" | "EXPIRED";

function getCertStatus(expiryDate: string | null): CertStatus {
  if (!expiryDate) return "VALID";
  const days = differenceInDays(new Date(expiryDate), new Date());
  if (days <= 0) return "EXPIRED";
  if (days <= 30) return "EXPIRING_SOON";
  return "VALID";
}

const STATUS_CONFIG: Record<CertStatus, { label: string; icon: React.ReactNode; badge: string; accent: string }> = {
  VALID: {
    label: "Valid",
    icon: <CheckCircle2 className="h-2.5 w-2.5" />,
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30",
    accent: "border-l-emerald-500",
  },
  EXPIRING_SOON: {
    label: "Expiring Soon",
    icon: <AlertTriangle className="h-2.5 w-2.5" />,
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 border-amber-200 dark:border-amber-500/30",
    accent: "border-l-amber-500",
  },
  EXPIRED: {
    label: "Expired",
    icon: <XCircle className="h-2.5 w-2.5" />,
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300 border-rose-200 dark:border-rose-500/30",
    accent: "border-l-rose-500",
  },
};

export default function CertificationsPage() {
  const { data: certs, isLoading, isError, refetch } = useCertifications();
  const create = useCreateCertification();

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [credentialId, setCredentialId] = useState("");
  const [credentialUrl, setCredentialUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CertStatus | "ALL">("ALL");

  const filteredCerts = useMemo(() => {
    if (!certs) return [];
    return certs.filter((c) => {
      const matchesSearch =
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.issuingOrganization ?? "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || getCertStatus(c.expiryDate) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [certs, searchQuery, statusFilter]);

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  const resetForm = useCallback(() => {
    setName("");
    setOrg("");
    setIssueDate("");
    setExpiryDate("");
    setCredentialId("");
    setCredentialUrl("");
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) resetForm();
    setSheetOpen(open);
  }, [resetForm]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value), []);
  const handleOrgChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setOrg(e.target.value), []);
  const handleIssueDateChange = useCallback((value: string) => {
    setIssueDate(value);
    setExpiryDate((prev) => clearEndIfInvalid(value, prev, "after"));
  }, []);
  const handleExpiryDateChange = useCallback((value: string) => setExpiryDate(value), []);
  const expiryBounds = planningEndPickerProps({
    startDate: issueDate,
    mode: "after",
    floorDate: parseDateOnly(issueDate),
    enforceTodayFloor: false,
  });
  const handleCredentialIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setCredentialId(e.target.value), []);
  const handleCredentialUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setCredentialUrl(e.target.value), []);
  const handleSearchChange = useCallback((value: string) => setSearchQuery(value), []);
  const handleSetFilterAll = useCallback(() => setStatusFilter("ALL"), []);
  const handleSetFilterValid = useCallback(() => setStatusFilter("VALID"), []);
  const handleSetFilterExpiring = useCallback(() => setStatusFilter("EXPIRING_SOON"), []);
  const handleSetFilterExpired = useCallback(() => setStatusFilter("EXPIRED"), []);

  const handleCreate = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) { toast.error("Certification name is required"); return; }
    if (trimmedName.length < 2) { toast.error("Certification name must be at least 2 characters"); return; }
    if (trimmedName.length > 100) { toast.error("Certification name must be at most 100 characters"); return; }
    const trimmedOrg = org.trim();
    if (!trimmedOrg) { toast.error("Issuing organization is required"); return; }
    if (issueDate && expiryDate && expiryDate < issueDate) {
      toast.error("Expiry date must be after the issue date");
      return;
    }
    const trimmedCredentialId = credentialId.trim();
    if (!trimmedCredentialId) { toast.error("Credential ID is required"); return; }
    if (trimmedCredentialId.length > 100) { toast.error("Credential ID must be at most 100 characters"); return; }
    if (credentialUrl && credentialUrl.trim() && !credentialUrl.trim().startsWith("http")) {
      toast.error("Credential URL must be a valid URL starting with http");
      return;
    }
    create.mutate(
      {
        name: trimmedName,
        issuingOrganization: trimmedOrg,
        issueDate: issueDate || undefined,
        expiryDate: expiryDate || undefined,
        credentialId: trimmedCredentialId,
        credentialUrl: credentialUrl.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Certification added");
          setSheetOpen(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [name, org, issueDate, expiryDate, credentialId, credentialUrl, create, resetForm]);

  if (isLoading) {
    return (
      <PageWrapper title="Certifications" subtitle="Track professional certifications and renewals" variant="display">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Certifications" subtitle="Track professional certifications and renewals" variant="display">
        <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
          <AlertCircle className="w-8 text-destructive" />
          <div>
            <p className="text-sm font-medium text-foreground">Failed to load certifications</p>
            <p className="text-xs text-muted-foreground mt-0.5">Something went wrong. Please try again.</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleRetry}>Try again</Button>
        </div>
      </PageWrapper>
    );
  }

  const validCount = certs?.filter((c) => getCertStatus(c.expiryDate) === "VALID").length ?? 0;
  const expiringCount = certs?.filter((c) => getCertStatus(c.expiryDate) === "EXPIRING_SOON").length ?? 0;
  const expiredCount = certs?.filter((c) => getCertStatus(c.expiryDate) === "EXPIRED").length ?? 0;

  return (
    <PageWrapper
      title="Certifications"
      subtitle="Track professional certifications and renewals"
      actions={
        <Button size="sm" className="gap-1.5" onClick={handleOpenSheet}>
          <Plus className="h-3.5 w-3.5" />
          Add Certification
        </Button>
      }
    >
      {!certs?.length ? (
        <EmptyState
          illustrationPreset="learning"
          title="No certifications recorded"
          description="Add professional certifications to track credentials and renewal dates."
        />
      ) : (
        <div className="space-y-3">
          <div className={FILTER_TOOLBAR_ROW}>
            <SearchInput placeholder="Search certifications..." value={searchQuery} onValueChange={handleSearchChange} className="w-48" />
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={handleSetFilterAll}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-full border transition-colors duration-200",
                  statusFilter === "ALL"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:bg-muted",
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={handleSetFilterValid}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-full border transition-colors duration-200",
                  statusFilter === "VALID"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:bg-muted",
                )}
              >
                Valid ({validCount})
              </button>
              <button
                type="button"
                onClick={handleSetFilterExpiring}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-full border transition-colors duration-200",
                  statusFilter === "EXPIRING_SOON"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:bg-muted",
                )}
              >
                Expiring Soon ({expiringCount})
              </button>
              <button
                type="button"
                onClick={handleSetFilterExpired}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-full border transition-colors duration-200",
                  statusFilter === "EXPIRED"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:bg-muted",
                )}
              >
                Expired ({expiredCount})
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCerts.length === 0 ? (
              <p className="col-span-full text-center text-sm text-muted-foreground py-10">
                No certifications match your filters.
              </p>
            ) : (
              filteredCerts.map((cert: Certification) => {
                const status = getCertStatus(cert.expiryDate);
                const cfg = STATUS_CONFIG[status];
                const daysLeft = cert.expiryDate
                  ? differenceInDays(new Date(cert.expiryDate), new Date())
                  : null;

                return (
                  <Card
                    key={cert.id}
                    className={cn(
                      "rounded-2xl border border-border/70 bg-card/90 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 border-l-4",
                      cfg.accent,
                    )}
                  >
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Award className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <TruncatedText text={cert.name} className="text-sm font-semibold text-foreground leading-tight" />
                            {cert.issuingOrganization && (
                              <TruncatedText text={cert.issuingOrganization} className="text-[11px] text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0", cfg.badge)}>
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        {cert.user?.name && (
                          <span className="flex items-center gap-1">
                            <User className="h-2.5 w-2.5" />
                            {cert.user.name}
                          </span>
                        )}
                        {cert.issueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" />
                            Issued {format(new Date(cert.issueDate), "MMM yyyy")}
                          </span>
                        )}
                      </div>

                      {cert.expiryDate && (
                        <div className={cn(
                          "rounded-lg px-3 py-2 text-[11px] font-medium",
                          status === "EXPIRED"
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                            : status === "EXPIRING_SOON"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                            : "bg-muted/50 text-muted-foreground",
                        )}>
                          {status === "EXPIRED"
                            ? `Expired ${format(new Date(cert.expiryDate), "MMM d, yyyy")} (${Math.abs(daysLeft ?? 0)}d ago)`
                            : status === "EXPIRING_SOON"
                            ? `Expires ${format(new Date(cert.expiryDate), "MMM d, yyyy")} (${daysLeft}d left)`
                            : `Expires ${format(new Date(cert.expiryDate), "MMM yyyy")}`}
                        </div>
                      )}

                      {cert.credentialUrl && (
                        <a
                          href={cert.credentialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View Credential
                        </a>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title="Add Certification"
        onSubmit={handleCreate}
        submitLabel="Add"
        isPending={create.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Certification Name <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="e.g., AWS Solutions Architect"
            value={name}
            onChange={handleNameChange}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Issuing Organization <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="e.g., Amazon Web Services"
            value={org}
            onChange={handleOrgChange}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Issue Date</label>
            <DatePicker value={issueDate ?? ""} onChange={handleIssueDateChange} placeholder="Pick a date" className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Expiry Date</label>
            <DatePicker
              value={expiryDate ?? ""}
              onChange={handleExpiryDateChange}
              placeholder="Pick a date"
              className="text-sm"
              fromDate={expiryBounds.fromDate}
              fromYear={expiryBounds.fromYear}
              toYear={expiryBounds.toYear}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Credential ID <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="Certificate ID"
            value={credentialId}
            onChange={handleCredentialIdChange}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Credential URL</label>
          <Input
            type="url"
            placeholder="https://..."
            value={credentialUrl}
            onChange={handleCredentialUrlChange}
          />
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
