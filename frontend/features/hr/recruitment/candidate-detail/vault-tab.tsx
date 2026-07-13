"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, ChevronDown, FolderLock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCandidateVault } from "@/hooks/api/hr/recruitment";
import type { BgvStatus as CandidateBgvStatus } from "@/types/hr";
import { BgvTracker } from "./vault-bgv-tracker";
import { VaultUploadArea } from "./vault-upload-area";
import { VaultDocumentList } from "./vault-document-list";
import { VaultAccessLog } from "./vault-access-log";

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  AADHAR: "Aadhar",
  PAN: "PAN",
  PASSPORT: "Passport",
  CERTIFICATE: "Certificate",
  OFFER_LETTER: "Offer Letter",
  OTHER: "Other",
};

export interface VaultTabProps {
  candidateId: number;
  bgvStatus: CandidateBgvStatus | null;
  bgvAgency: string | null;
  bgvNotes: string | null;
  bgvInitiatedAt: string | null;
  bgvCompletedAt: string | null;
}

export function VaultTab(props: VaultTabProps) {
  const [showUpload, setShowUpload] = useState(false);
  const { data: docs } = useCandidateVault(props.candidateId);

  const handleToggleUpload = useCallback(() => setShowUpload((p) => !p), []);

  const categoryCounts = (docs ?? []).reduce<Record<string, number>>(
    (acc, doc) => {
      const key = doc.documentType ?? "OTHER";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const totalDocuments = docs?.length ?? 0;

  return (
    <div className="space-y-4">
      <BgvTracker
        candidateId={props.candidateId}
        bgvStatus={props.bgvStatus}
        bgvAgency={props.bgvAgency}
        bgvNotes={props.bgvNotes}
        bgvInitiatedAt={
          props.bgvInitiatedAt ? String(props.bgvInitiatedAt) : null
        }
        bgvCompletedAt={
          props.bgvCompletedAt ? String(props.bgvCompletedAt) : null
        }
      />

      <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <FolderLock
                className="h-3.5 w-3.5 text-primary"
                aria-hidden="true"
              />
            </div>
            <CardTitle className="text-sm font-semibold text-foreground">
              Verification Documents
            </CardTitle>
            {totalDocuments > 0 && (
              <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                {totalDocuments}
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={handleToggleUpload}
          >
            <Upload className="h-3 w-3" />
            {showUpload ? "Hide" : "Upload"}
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform duration-200",
                showUpload && "rotate-180",
              )}
            />
          </Button>
        </CardHeader>

        {totalDocuments > 0 && Object.keys(categoryCounts).length > 0 && (
          <div className="px-4 py-2.5 border-b border-border flex flex-wrap gap-1.5">
            {Object.entries(categoryCounts).map(([type, count]) => (
              <span
                key={type}
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-primary/10 text-foreground border-primary/20"
              >
                <FileText className="h-2.5 w-2.5" aria-hidden="true" />
                {DOCUMENT_TYPE_LABELS[type] ?? type} · {count}
              </span>
            ))}
          </div>
        )}

        <CardContent className="p-4 space-y-3">
          {showUpload && <VaultUploadArea candidateId={props.candidateId} />}
          <VaultDocumentList candidateId={props.candidateId} />
        </CardContent>
      </Card>

      <VaultAccessLog candidateId={props.candidateId} />
    </div>
  );
}
