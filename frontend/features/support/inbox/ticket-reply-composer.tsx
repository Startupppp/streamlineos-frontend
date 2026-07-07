"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Loader2, Send, Paperclip, X, FileText, Image as ImageIcon, Wand2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { apiClient } from "@/lib/api-client";
import { useAddSupportMessage } from "@/hooks/api/support";
import {
  useSupportMacros,
  usePreviewMacro,
  useApplyMacro,
  type SupportMacro,
} from "@/hooks/api/support/macros";
import {
  SUPPORT_FOCUS_REPLY_EVENT,
  SUPPORT_INSERT_REPLY_DRAFT_EVENT,
  type SupportFocusReplyDetail,
  type SupportInsertReplyDraftDetail,
} from "./use-inbox-shortcuts";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

interface PendingAttachment {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

function fileMimeIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  return FileText;
}

interface TicketReplyComposerProps {
  ticketId: number;
}

export function TicketReplyComposer({ ticketId }: TicketReplyComposerProps) {
  const [replyText, setReplyText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [macroPopoverOpen, setMacroPopoverOpen] = useState(false);
  const [macroSearch, setMacroSearch] = useState("");
  const [previewMacro, setPreviewMacro] = useState<SupportMacro | null>(null);
  const [previewBody, setPreviewBody] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addMessage = useAddSupportMessage();
  const { data: macros } = useSupportMacros();
  const previewMacroMutation = usePreviewMacro();
  const applyMacro = useApplyMacro();

  const filteredMacros = useMemo(() => {
    const term = macroSearch.trim().toLowerCase();
    if (!term) return macros ?? [];
    return (macros ?? []).filter(
      (macro) =>
        macro.title.toLowerCase().includes(term) ||
        (macro.category ?? "").toLowerCase().includes(term),
    );
  }, [macros, macroSearch]);

  useEffect(() => {
    function handleFocusReply(e: Event) {
      const detail = (e as CustomEvent<SupportFocusReplyDetail>).detail;
      setIsInternal(detail?.internal ?? false);
      textareaRef.current?.focus();
    }
    window.addEventListener(SUPPORT_FOCUS_REPLY_EVENT, handleFocusReply);
    return () => window.removeEventListener(SUPPORT_FOCUS_REPLY_EVENT, handleFocusReply);
  }, []);

  useEffect(() => {
    function handleInsertReplyDraft(e: Event) {
      const detail = (e as CustomEvent<SupportInsertReplyDraftDetail>).detail;
      if (!detail?.body) return;
      setReplyText(detail.body);
      textareaRef.current?.focus();
    }
    window.addEventListener(SUPPORT_INSERT_REPLY_DRAFT_EVENT, handleInsertReplyDraft);
    return () => window.removeEventListener(SUPPORT_INSERT_REPLY_DRAFT_EVENT, handleInsertReplyDraft);
  }, []);

  const handleMacroSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setMacroSearch(e.target.value),
    [],
  );

  const handleSelectMacro = useCallback(
    (macro: SupportMacro) => {
      setMacroPopoverOpen(false);
      previewMacroMutation.mutate(
        { macroId: macro.id, ticketId },
        {
          onSuccess: (result) => {
            setPreviewMacro(macro);
            setPreviewBody(result.body);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [previewMacroMutation, ticketId],
  );

  const handleClosePreview = useCallback(() => {
    setPreviewMacro(null);
    setPreviewBody("");
  }, []);

  const handleConfirmApplyMacro = useCallback(() => {
    if (!previewMacro) return;
    applyMacro.mutate(
      { macroId: previewMacro.id, ticketId },
      {
        onSuccess: (result) => {
          setReplyText(result.body);
          setIsInternal(result.isInternal);
          toast.success("Macro applied");
          handleClosePreview();
          textareaRef.current?.focus();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [applyMacro, previewMacro, ticketId, handleClosePreview]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const oversized = files.find((f) => f.size > MAX_ATTACHMENT_SIZE);
    if (oversized) {
      toast.error(`${oversized.name} exceeds 10MB limit`);
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const uploaded: PendingAttachment[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "support-attachments");
        const json = await apiClient.upload<{ url: string }>("/storage/upload", fd);
        uploaded.push({
          fileName: file.name,
          fileUrl: json.url,
          fileSize: file.size,
          mimeType: file.type,
        });
      }
      setPendingFiles((prev) => [...prev, ...uploaded]);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }, []);

  const handleRemoveFile = useCallback((idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleAttachClick = useCallback(() => fileRef.current?.click(), []);

  const handleReply = useCallback(() => {
    if (!replyText.trim() && pendingFiles.length === 0) return;
    addMessage.mutate(
      { ticketId, body: replyText || "(attachment)", isInternal, attachments: pendingFiles },
      {
        onSuccess: () => {
          setReplyText("");
          setPendingFiles([]);
          toast.success("Reply sent");
        },
      },
    );
  }, [replyText, ticketId, isInternal, pendingFiles, addMessage]);

  const handleToggleInternal = useCallback(() => setIsInternal((v) => !v), []);

  const handleReplyChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setReplyText(e.target.value),
    [],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const isPlainEnter = e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey;
      const isModifierEnter = e.key === "Enter" && (e.metaKey || e.ctrlKey);
      if (isPlainEnter || isModifierEnter) {
        e.preventDefault();
        handleReply();
      }
    },
    [handleReply],
  );

  return (
    <div className="px-4 py-3 border-t border-border/40 shrink-0">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Switch checked={isInternal} onCheckedChange={handleToggleInternal} className="h-4 w-7" />
          <Label
            className="text-[11px] text-muted-foreground cursor-pointer"
            onClick={handleToggleInternal}
          >
            {isInternal ? "Internal note (not visible to client)" : "Public reply"}
          </Label>
        </div>
        <Popover open={macroPopoverOpen} onOpenChange={setMacroPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] text-muted-foreground"
            >
              <Wand2 className="h-3 w-3 mr-1" />
              Use macro
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="end">
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-7 h-8 text-xs"
                placeholder="Search canned responses…"
                value={macroSearch}
                onChange={handleMacroSearchChange}
                autoFocus
              />
            </div>
            <div className="max-h-56 overflow-y-auto space-y-0.5">
              {filteredMacros.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">
                  No canned responses found
                </p>
              ) : (
                filteredMacros.map((macro) => (
                  <button
                    key={macro.id}
                    type="button"
                    onClick={() => handleSelectMacro(macro)}
                    className="flex w-full items-center gap-2 rounded p-1.5 text-left text-xs hover:bg-muted transition-colors"
                  >
                    <span className="truncate flex-1">{macro.title}</span>
                    {macro.category && (
                      <Badge variant="secondary" className="text-[9px] shrink-0">
                        {macro.category}
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {pendingFiles.map((f, i) => {
            const Icon = fileMimeIcon(f.mimeType);
            return (
              <div key={i} className="flex items-center gap-1 text-[11px] bg-muted rounded px-2 py-0.5 border">
                <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate max-w-[100px]">{f.fileName}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(i)}
                  className="ml-0.5 text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${f.fileName}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={replyText}
          onChange={handleReplyChange}
          placeholder={isInternal ? "Add internal note..." : "Type your reply..."}
          className={cn(
            "min-h-[60px] max-h-[120px] text-sm resize-none",
            isInternal && "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800/40",
          )}
          onKeyDown={handleKeyDown}
        />
        <div className="flex flex-col gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-[28px] w-10 shrink-0"
            onClick={handleAttachClick}
            disabled={uploading}
            aria-label="Attach file"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
          </Button>
          <Button
            onClick={handleReply}
            disabled={(!replyText.trim() && pendingFiles.length === 0) || addMessage.isPending}
            size="icon"
            className="h-[28px] w-10 shrink-0"
            aria-label="Send reply"
          >
            {addMessage.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={handleFileSelect}
        aria-label="Attach files"
      />
      <Dialog open={!!previewMacro} onOpenChange={handleClosePreview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{previewMacro?.title}</DialogTitle>
            <DialogDescription>
              Applying this macro will insert the rendered text below and may update the
              ticket&apos;s status/priority.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
            {previewMacroMutation.isPending ? "Loading preview…" : previewBody}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClosePreview}>
              Cancel
            </Button>
            <Button onClick={handleConfirmApplyMacro} disabled={applyMacro.isPending}>
              {applyMacro.isPending ? "Applying…" : "Apply & Insert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
