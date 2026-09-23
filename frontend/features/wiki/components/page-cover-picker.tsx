"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KbImageIcon } from "@/features/wiki/lib/kb-icons";
import { uploadKbMedia } from "@/features/wiki/lib/upload-kb-media";
import { getErrorMessage } from "@/lib/get-error-message";

export const COVER_GRADIENT_PRESETS = [
  { key: "slate", css: "linear-gradient(135deg, #1e293b 0%, #334155 100%)" },
  { key: "ocean", css: "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)" },
  { key: "forest", css: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)" },
  { key: "sunset", css: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)" },
  { key: "rose", css: "linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)" },
  { key: "violet", css: "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)" },
  { key: "amber", css: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)" },
  { key: "dark", css: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" },
] as const;

interface PageCoverPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCoverChange: (cover: string | null) => void;
  pageId?: number;
}

export function PageCoverPickerDialog({
  open,
  onOpenChange,
  onCoverChange,
  pageId,
}: PageCoverPickerDialogProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleOpenChange(next: boolean) {
    if (uploading) return;
    onOpenChange(next);
  }

  function handleGradientSelect(e: React.MouseEvent<HTMLButtonElement>) {
    const key = e.currentTarget.dataset.gradientKey;
    if (!key) return;
    onCoverChange(`gradient:${key}`);
    onOpenChange(false);
  }

  function handlePickImage() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadKbMedia(file, pageId);
      onCoverChange(result.key);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to upload cover", { description: getErrorMessage(error) });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Page cover</DialogTitle>
        </DialogHeader>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <p className="text-xs font-semibold text-foreground">Gradient</p>
        <div className="grid grid-cols-4 gap-2">
          {COVER_GRADIENT_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              data-gradient-key={preset.key}
              className="h-10 rounded-md border border-border hover:ring-2 hover:ring-ring"
              style={{ background: preset.css }}
              onClick={handleGradientSelect}
              aria-label={`${preset.key} gradient`}
            />
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          className="w-full"
          onClick={handlePickImage}
          disabled={uploading}
        >
          <KbImageIcon className="mr-1 h-3 w-3" />
          {uploading ? "Uploading…" : "Upload image"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
