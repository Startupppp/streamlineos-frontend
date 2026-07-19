"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { MoveVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { KbImageIcon, KbXIcon } from "@/features/knowledge-base/lib/kb-icons";
import { uploadKbMedia } from "@/features/knowledge-base/lib/upload-kb-media";
import { getErrorMessage } from "@/lib/get-error-message";

const GRADIENT_PRESETS = [
  { key: "slate", css: "linear-gradient(135deg, #1e293b 0%, #334155 100%)" },
  { key: "ocean", css: "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)" },
  { key: "forest", css: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)" },
  { key: "sunset", css: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)" },
  { key: "rose", css: "linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)" },
  { key: "violet", css: "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)" },
  { key: "amber", css: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)" },
  { key: "dark", css: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" },
] as const;

interface ParsedCover {
  url: string;
  posY: number;
  isGradient: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseCover(coverImage: string): ParsedCover {
  if (coverImage.startsWith("gradient:")) {
    return { url: coverImage, posY: 50, isGradient: true };
  }
  const marker = coverImage.indexOf("#y=");
  if (marker === -1) return { url: coverImage, posY: 50, isGradient: false };
  const raw = Number(coverImage.slice(marker + 3));
  const posY = Number.isFinite(raw) ? clamp(raw, 0, 100) : 50;
  return { url: coverImage.slice(0, marker), posY, isGradient: false };
}

function getCoverStyle(parsed: ParsedCover, displayPosY: number): React.CSSProperties {
  if (parsed.isGradient) {
    const key = parsed.url.slice(9);
    const preset = GRADIENT_PRESETS.find((p) => p.key === key);
    return preset ? { background: preset.css } : {};
  }
  return {
    backgroundImage: `url(${parsed.url})`,
    backgroundSize: "cover",
    backgroundPosition: `center ${displayPosY}%`,
  };
}

interface PageCoverProps {
  coverImage: string | null;
  isEditable: boolean;
  onCoverChange: (cover: string | null) => void;
}

function GradientPicker({
  onSelect,
}: {
  onSelect: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2 mb-3">
      {GRADIENT_PRESETS.map((p) => (
        <button
          key={p.key}
          data-gradient-key={p.key}
          className="h-10 rounded-md border border-border hover:ring-2 hover:ring-primary transition-all"
          style={{ background: p.css }}
          onClick={onSelect}
          aria-label={p.key}
        />
      ))}
    </div>
  );
}

export default function PageCover({
  coverImage,
  isEditable,
  onCoverChange,
}: PageCoverProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [repositioning, setRepositioning] = useState(false);
  const [posY, setPosY] = useState(50);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ startY: number; startPos: number } | null>(null);

  function handleGradientSelect(e: React.MouseEvent<HTMLButtonElement>) {
    const key = e.currentTarget.dataset.gradientKey;
    if (!key) return;
    onCoverChange(`gradient:${key}`);
    setPickerOpen(false);
  }

  function handleRemoveCover() {
    onCoverChange(null);
    setPickerOpen(false);
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
      const result = await uploadKbMedia(file);
      onCoverChange(result.url);
      setPickerOpen(false);
    } catch (error) {
      toast.error("Failed to upload cover", { description: getErrorMessage(error) });
    } finally {
      setUploading(false);
    }
  }

  function handleStartReposition() {
    if (!coverImage) return;
    setPosY(parseCover(coverImage).posY);
    setRepositioning(true);
    setPickerOpen(false);
  }

  function handleCancelReposition() {
    dragRef.current = null;
    setRepositioning(false);
  }

  function handleSaveReposition() {
    if (!coverImage) return;
    const parsed = parseCover(coverImage);
    onCoverChange(`${parsed.url}#y=${Math.round(posY)}`);
    dragRef.current = null;
    setRepositioning(false);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!repositioning) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startPos: posY };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!repositioning || !dragRef.current) return;
    const height = e.currentTarget.clientHeight || 160;
    const delta = e.clientY - dragRef.current.startY;
    setPosY(clamp(dragRef.current.startPos - (delta / height) * 100, 0, 100));
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function stopPointer(e: React.PointerEvent) {
    e.stopPropagation();
  }

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/jpeg,image/png,image/gif,image/webp"
      className="hidden"
      onChange={handleFileChange}
    />
  );

  const picker = (
    <>
      <p className="text-xs font-semibold mb-2">Choose gradient</p>
      <GradientPicker onSelect={handleGradientSelect} />
      <p className="text-xs font-semibold mb-1">Or upload an image</p>
      <Button
        size="sm"
        onClick={handlePickImage}
        disabled={uploading}
        className="text-xs w-full"
      >
        <KbImageIcon className="h-3 w-3 mr-1" />
        {uploading ? "Uploading…" : "Upload image"}
      </Button>
    </>
  );

  if (!coverImage) {
    if (!isEditable) return null;
    return (
      <div className="relative flex h-10 w-full items-center justify-center px-3">
        {fileInput}
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground gap-1"
            >
              <KbImageIcon className="h-3 w-3" />
              Add cover
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4">{picker}</PopoverContent>
        </Popover>
      </div>
    );
  }

  const parsed = parseCover(coverImage);
  const displayPosY = repositioning ? posY : parsed.posY;

  return (
    <div
      className={`group relative h-40 w-full ${repositioning ? "cursor-grab select-none active:cursor-grabbing" : ""}`}
      style={getCoverStyle(parsed, displayPosY)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {isEditable && repositioning && (
        <>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white shadow-sm">
              Drag image up or down to reposition
            </span>
          </div>
          <div className="absolute bottom-3 right-4 flex gap-2" onPointerDown={stopPointer}>
            <Button
              size="sm"
              variant="secondary"
              className="text-xs"
              onClick={handleCancelReposition}
            >
              Cancel
            </Button>
            <Button size="sm" className="text-xs" onClick={handleSaveReposition}>
              Save position
            </Button>
          </div>
        </>
      )}

      {isEditable && !repositioning && (
        <div className="absolute bottom-3 right-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          {fileInput}
          {!parsed.isGradient && (
            <Button
              size="sm"
              variant="secondary"
              className="text-xs"
              onClick={handleStartReposition}
            >
              <MoveVertical className="mr-1 h-3 w-3" />
              Reposition
            </Button>
          )}
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="secondary" className="text-xs h-7">
                Change cover
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4">{picker}</PopoverContent>
          </Popover>

          <Button
            size="sm"
            variant="secondary"
            className="text-xs h-7"
            onClick={handleRemoveCover}
          >
            <KbXIcon className="h-3 w-3 mr-1" />
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}
