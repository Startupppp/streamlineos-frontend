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

interface ContactAttachmentsSectionProps {
  contactId: number;
}

export function ContactAttachmentsSection({ contactId }: ContactAttachmentsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["contact-attachments", contactId] as const,
    queryFn: () => apiClient.get<{ attachments: Attachment[] }>(`/contacts/${contactId}/attachments`),
    enabled: contactId > 0,
    staleTime: 2 * 60_000,
  });

  const uploadMutation = useMutation({
    mutationKey: ["contact-attachments", "upload"],
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.post<{ attachment: Attachment }>(`/contacts/${contactId}/attachments`, formData);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["contact-attachments", contactId] });
      toast.success("File attached");
    },
    onError: () => toast.error("Failed to upload file"),
  });

  const deleteMutation = useMutation({
    mutationKey: ["contact-attachments", "delete"],
    mutationFn: (attachmentId: number) =>
      apiClient.delete<{ success: boolean }>(`/contacts/${contactId}/attachments/${attachmentId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["contact-attachments", contactId] });
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
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
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
            <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : attachments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
          <Paperclip className="h-6 w-6 text-slate-300 mb-1.5" />
          <p className="text-xs text-slate-400">No files attached</p>
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
              className="flex items-center gap-2.5 p-2.5 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/80 shadow-sm group"
            >
              <File className="h-4 w-4 text-violet-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">{att.fileName}</p>
                <p className="text-[10px] text-muted-foreground">{formatFileSize(att.fileSize)}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={att.url} download className="p-1 rounded hover:bg-muted transition-colors">
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                </a>
                <button
                  type="button"
                  onClick={handleDelete(att.id)}
                  className="p-1 rounded hover:bg-red-50 transition-colors"
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
