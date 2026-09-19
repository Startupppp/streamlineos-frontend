"use client";

import { useRef, useState, type CSSProperties } from "react";
import { MoveVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KbXIcon } from "@/features/wiki/lib/kb-icons";
import { resolveImageUrl } from "@/lib/utils";
import { COVER_GRADIENT_PRESETS } from "./page-cover-picker";

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

function getCoverStyle(parsed: ParsedCover, displayPosY: number): CSSProperties {
  if (parsed.isGradient) {
    const key = parsed.url.slice(9);
    const preset = COVER_GRADIENT_PRESETS.find((p) => p.key === key);
    return preset ? { background: preset.css } : {};
  }
  const url = resolveImageUrl(parsed.url);
  if (!url) return {};
  return {
    backgroundImage: `url("${url}")`,
    backgroundSize: "cover",
    backgroundPosition: `center ${displayPosY}%`,
  };
}

export function coverSurfaceStyle(coverImage: string): CSSProperties {
  const parsed = parseCover(coverImage);
  return getCoverStyle(parsed, parsed.posY);
}

interface PageCoverProps {
  coverImage: string | null;
  isEditable: boolean;
  onCoverChange: (cover: string | null) => void;
  onChangeCover: () => void;
}

export default function PageCover({
  coverImage,
  isEditable,
  onCoverChange,
  onChangeCover,
}: PageCoverProps) {
  const [repositioning, setRepositioning] = useState(false);
  const [posY, setPosY] = useState(50);
  const dragRef = useRef<{ startY: number; startPos: number } | null>(null);

  function handleRemoveCover() {
    onCoverChange(null);
  }

  function handleStartReposition() {
    if (!coverImage) return;
    setPosY(parseCover(coverImage).posY);
    setRepositioning(true);
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

  if (!coverImage) return null;

  const parsed = parseCover(coverImage);
  const displayPosY = repositioning ? posY : parsed.posY;

  return (
    <div
      className={`group relative h-36 w-full sm:h-44 ${repositioning ? "cursor-grab select-none active:cursor-grabbing" : ""}`}
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
              Drag to reposition
            </span>
          </div>
          <div className="absolute bottom-3 right-4 flex gap-2" onPointerDown={stopPointer}>
            <Button size="sm" variant="secondary" className="text-xs" onClick={handleCancelReposition}>
              Cancel
            </Button>
            <Button size="sm" className="text-xs" onClick={handleSaveReposition}>
              Save position
            </Button>
          </div>
        </>
      )}

      {isEditable && !repositioning && (
        <div className="absolute bottom-3 right-4 flex gap-2 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
          {!parsed.isGradient && (
            <Button size="sm" variant="secondary" className="h-9 text-xs" onClick={handleStartReposition}>
              <MoveVertical className="mr-1 h-3 w-3" />
              Reposition
            </Button>
          )}
          <Button size="sm" variant="secondary" className="h-9 text-xs" onClick={onChangeCover}>
            Change
          </Button>
          <Button size="sm" variant="secondary" className="h-9 text-xs" onClick={handleRemoveCover}>
            <KbXIcon className="mr-1 h-3 w-3" />
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}
