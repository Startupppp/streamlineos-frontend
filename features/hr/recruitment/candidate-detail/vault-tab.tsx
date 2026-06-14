"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BgvStatus as CandidateBgvStatus } from "@/types/hr";
import { BgvTracker } from "./vault-bgv-tracker";
import { VaultUploadArea } from "./vault-upload-area";
import { VaultDocumentList } from "./vault-document-list";
import { VaultAccessLog } from "./vault-access-log";

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

  const handleToggleUpload = useCallback(() => setShowUpload((p) => !p), []);

  return (
    <div className="space-y-4">
      <BgvTracker
        candidateId={props.candidateId}
        bgvStatus={props.bgvStatus}
        bgvAgency={props.bgvAgency}
        bgvNotes={props.bgvNotes}
        bgvInitiatedAt={props.bgvInitiatedAt ? String(props.bgvInitiatedAt) : null}
        bgvCompletedAt={props.bgvCompletedAt ? String(props.bgvCompletedAt) : null}
      />

      <Card>
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Verification Documents
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleToggleUpload}
          >
            <Upload className="h-3 w-3" />
            {showUpload ? "Hide Upload" : "Upload"}
            <ChevronDown
              className={cn("h-3 w-3 transition-transform", showUpload && "rotate-180")}
            />
          </Button>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          {showUpload && <VaultUploadArea candidateId={props.candidateId} />}
          <VaultDocumentList candidateId={props.candidateId} />
        </CardContent>
      </Card>

      <VaultAccessLog candidateId={props.candidateId} />
    </div>
  );
}
