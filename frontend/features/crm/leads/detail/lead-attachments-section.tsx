"use client";

import { useRef, useCallback } from "react";
import { Paperclip, Upload, File, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface Attachment {
  id: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  createdAt: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface LeadAttachmentsSectionProps {
  leadId: number;
}

export function LeadAttachmentsSection({ leadId }: LeadAttachmentsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["lead-attachments", leadId] as const,
    queryFn: () => apiClient.get<{ attachments: Attachment[] }>(`/leads/${leadId}/attachments`),
    enabled: leadId > 0,
    staleTime: 2 * 60_000,
  });

  const uploadMutation = useMutation({
    mutationKey: ["lead-attachments", "upload"],
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.post<{ attachment: Attachment }>(`/leads/${leadId}/attachments`, formData);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["lead-attachments", leadId] });
      toast.success("File attached");
    },
    onError: () => toast.error("Failed to upload file"),
  });

  const deleteMutation = useMutation({
    mutationKey: ["lead-attachments", "delete"],
    mutationFn: (attachmentId: number) =>
      apiClient.delete<{ success: boolean }>(`/leads/${leadId}/attachments/${attachmentId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["lead-attachments", leadId] });
      toast.success("File removed");
    },
    onError: () => toast.error("Failed to remove file"),
  });

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      uploadMutation.mutate(file);
      e.target.value = "";
    },
    [uploadMutation],
  );

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  function handleDelete(attachmentId: number) {
    return () => deleteMutation.mutate(attachmentId);
  }

  const attachments = data?.attachments ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
          Attachments
        </h3>
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={handleUploadClick}
            disabled={uploadMutation.isPending}
          >
            <Upload className="h-3.5 w-3.5" />
            Attach File
          </Button>
        </motion.div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileInputChange}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : attachments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 border border-dashed border-border rounded-lg bg-muted/20 text-center">
          <Paperclip className="h-6 w-6 text-muted-foreground/40 mb-1.5" />
          <p className="text-xs text-muted-foreground">No files attached</p>
        </div>
      ) : (
        <AnimatePresence>
          {attachments.map((att, idx) => (
            <motion.div
              key={att.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ delay: idx * 0.04 }}
              className="flex items-center gap-2.5 p-2.5 bg-card rounded-lg border border-border shadow-sm group"
            >
              <File className="h-4 w-4 text-blue-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{att.fileName}</p>
                <p className="text-[10px] text-muted-foreground">{formatFileSize(att.fileSize)}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={att.url} download className="p-1 rounded hover:bg-muted transition-colors">
                  <Download className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
                <button
                  type="button"
                  onClick={handleDelete(att.id)}
                  className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
