"use client";

import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import type { SignField } from "@/types/sign";
import { fieldTypeMeta } from "./field-types";

interface FieldBoxProps {
  field: SignField;
  scale: number;
  color: { bg: string; border: string; text: string };
  isSelected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
}

export function FieldBox({ field, scale, color, isSelected, onSelect, onMove, onResize }: FieldBoxProps) {
  const dragStart = useRef<{ mouseX: number; mouseY: number; fieldX: number; fieldY: number } | null>(null);
  const resizeStart = useRef<{ mouseX: number; mouseY: number; width: number; height: number } | null>(null);
  const meta = fieldTypeMeta(field.fieldType);

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!dragStart.current) return;
      const dxPt = (e.clientX - dragStart.current.mouseX) / scale;
      const dyPt = (e.clientY - dragStart.current.mouseY) / scale;
      onMove(Math.max(0, dragStart.current.fieldX + dxPt), Math.max(0, dragStart.current.fieldY + dyPt));
    },
    [scale, onMove],
  );

  const handleDragEnd = useCallback(() => {
    dragStart.current = null;
    window.removeEventListener("mousemove", handleDragMove);
    window.removeEventListener("mouseup", handleDragEnd);
  }, [handleDragMove]);

  function handleDragStart(e: React.MouseEvent) {
    e.stopPropagation();
    onSelect();
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, fieldX: field.x, fieldY: field.y };
    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("mouseup", handleDragEnd);
  }

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!resizeStart.current) return;
      const dxPt = (e.clientX - resizeStart.current.mouseX) / scale;
      const dyPt = (e.clientY - resizeStart.current.mouseY) / scale;
      onResize(Math.max(16, resizeStart.current.width + dxPt), Math.max(16, resizeStart.current.height + dyPt));
    },
    [scale, onResize],
  );

  const handleResizeEnd = useCallback(() => {
    resizeStart.current = null;
    window.removeEventListener("mousemove", handleResizeMove);
    window.removeEventListener("mouseup", handleResizeEnd);
  }, [handleResizeMove]);

  function handleResizeStart(e: React.MouseEvent) {
    e.stopPropagation();
    resizeStart.current = { mouseX: e.clientX, mouseY: e.clientY, width: field.width, height: field.height };
    window.addEventListener("mousemove", handleResizeMove);
    window.addEventListener("mouseup", handleResizeEnd);
  }

  return (
    <div
      className={cn(
        "absolute flex items-center justify-center rounded border-2 cursor-move select-none text-[10px] font-medium",
        color.bg,
        isSelected ? "border-foreground" : color.border,
        color.text,
      )}
      style={{
        left: field.x * scale,
        top: field.y * scale,
        width: field.width * scale,
        height: field.height * scale,
      }}
      onMouseDown={handleDragStart}
    >
      <span className="truncate px-1">
        {field.label || meta.label}
        {field.required && <span className="text-destructive"> *</span>}
      </span>
      {isSelected && (
        <div
          className="absolute -right-1 -bottom-1 size-3 rounded-full bg-foreground cursor-nwse-resize"
          onMouseDown={handleResizeStart}
        />
      )}
    </div>
  );
}
