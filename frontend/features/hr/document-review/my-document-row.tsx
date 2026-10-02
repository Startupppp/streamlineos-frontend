"use client";

import { useCallback } from "react";
import { Download, Eye, FileClock, FileWarning, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  downloadProtectedFile,
  viewProtectedFile,
} from "@/hooks/common/use-file-url";
import { statusToneClasses } from "@/lib/design-tokens";
import type { MyOnboardingDoc } from "@/hooks/api/hr/documents";
import {
  MY_DOC_STATUS_LABELS,
  MY_DOC_STATUS_TONES,
  myDocumentRowActions,
  myDocumentRowHint,
} from "./my-document-status";

interface MyDocumentRowProps {
  doc: MyOnboardingDoc;
  canUploadSelf: boolean;
  onUpload: (doc: MyOnboardingDoc) => void;
}

export function MyDocumentRow({ doc, canUploadSelf, onUpload }: MyDocumentRowProps) {
  const actions = myDocumentRowActions(doc, canUploadSelf);
  const tone = statusToneClasses(MY_DOC_STATUS_TONES[doc.status]);
  const needsAttention =
    doc.status === "PENDING" ||
    doc.status === "REJECTED" ||
    doc.status === "RE_UPLOAD_REQUESTED";
  const StatusIcon = needsAttention ? FileWarning : FileClock;
  const endpoint = `/hr/onboarding-docs/me/${doc.id}/file`;

  const handleView = useCallback(() => {
    void viewProtectedFile(endpoint).catch(() =>
      toast.error("Couldn't open this document. Try downloading it instead."),
    );
  }, [endpoint]);

  const handleDownload = useCallback(() => {
    void downloadProtectedFile(
      endpoint,
      doc.fileName ?? doc.documentTypeName,
    ).catch(() => toast.error("Couldn't download this document."));
  }, [endpoint, doc.fileName, doc.documentTypeName]);

  const handleUpload = useCallback(() => onUpload(doc), [onUpload, doc]);

  return (
    <div className="flex min-w-0 flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
          <StatusIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-label font-medium text-foreground">
            {doc.documentTypeName}
          </p>
          <p className="truncate text-dense text-muted-foreground">
            {myDocumentRowHint(doc)}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Badge
          variant="outline"
          className={`h-5 shrink-0 px-2 py-0.5 text-micro ${tone.surface} ${tone.ink} ${tone.rule}`}
        >
          {MY_DOC_STATUS_LABELS[doc.status]}
        </Badge>
        {actions.canView ? (
          <Button
            variant="ghost"
            size="icon"
            className="min-h-11 w-11 sm:min-h-0 sm:h-8 sm:w-8"
            onClick={handleView}
            aria-label={`View ${doc.documentTypeName}`}
          >
            <Eye className="h-4 w-4" />
          </Button>
        ) : null}
        {actions.canDownload ? (
          <Button
            variant="ghost"
            size="icon"
            className="min-h-11 w-11 sm:min-h-0 sm:h-8 sm:w-8"
            onClick={handleDownload}
            aria-label={`Download ${doc.documentTypeName}`}
          >
            <Download className="h-4 w-4" />
          </Button>
        ) : null}
        {actions.canUpload ? (
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 gap-1.5 sm:min-h-0"
            onClick={handleUpload}
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            {actions.uploadLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
