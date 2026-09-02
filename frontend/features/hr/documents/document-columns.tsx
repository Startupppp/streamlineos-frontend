import { format } from "date-fns";
import type { DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import type { Document } from "@/types/hr";
import {
  DOCUMENT_TYPES,
  TYPE_BADGE_COLORS,
  formatFileSize,
  getFileIconConfig,
} from "./document-table-constants";
import { DocumentRowActions } from "./document-row-actions";

export function createDocumentColumns(
  onDelete: (documentId: number) => Promise<void>,
  onEdit: (doc: Document) => void,
  onSendForSignature: (doc: Document) => void,
): DataTableColumn<Document>[] {
  return [
    {
      key: "name",
      header: "Name",
      cell(doc) {
        const fileConfig = getFileIconConfig(doc.fileName ?? doc.name);
        const FileIcon = fileConfig.icon;
        return (
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
                fileConfig.bg,
              )}
            >
              <FileIcon className={cn("h-3.5 w-3.5", fileConfig.text)} />
            </div>
            <div className="min-w-0">
              <TruncatedText
                text={doc.fileName ?? doc.name}
                className="text-sm font-medium text-foreground leading-snug"
              />
              {doc.tags && doc.tags.length > 0 && (
                <div className="flex gap-1 mt-0.5 flex-wrap">
                  {doc.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className={cn(
                        "inline-flex items-center text-micro font-semibold px-1.5 py-0 rounded-full border",
                        tag.toLowerCase().includes("confidential")
                          ? "bg-status-danger-surface text-status-danger-ink border-status-danger-rule"
                          : "bg-muted text-muted-foreground border-border",
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "type",
      header: "Type",
      cell(doc) {
        const typeLabel =
          DOCUMENT_TYPES.find((t) => t.value === doc.type)?.label ?? "General";
        const badgeColor =
          TYPE_BADGE_COLORS[typeLabel] ?? TYPE_BADGE_COLORS["General"];
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border",
              badgeColor,
            )}
          >
            {typeLabel}
          </span>
        );
      },
    },
    {
      key: "date",
      header: "Date",
      className: "text-sm text-muted-foreground tabular-nums",
      cell(doc) {
        return doc.createdAt
          ? format(new Date(doc.createdAt), "MMM dd, yyyy")
          : "—";
      },
    },
    {
      key: "size",
      header: "Size",
      headerClassName: "text-right",
      className: "text-sm text-muted-foreground text-right tabular-nums",
      cell(doc) {
        return formatFileSize(doc.fileSize);
      },
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      cell(doc) {
        return (
          <DocumentRowActions
            doc={doc}
            onDelete={onDelete}
            onEdit={onEdit}
            onSendForSignature={onSendForSignature}
          />
        );
      },
    },
  ];
}
