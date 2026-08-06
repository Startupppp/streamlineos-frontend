"use client";

import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./dialog";
import { Button } from "./button";
import { Slider } from "./slider";
import { ZoomIn, ZoomOut, RotateCcw, Loader2 } from "lucide-react";

interface AvatarCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  loading?: boolean;
  title?: string;
  description?: string;
  aspectRatio?: number;
  cropShape?: "round" | "rect";
}

async function getCroppedImage(
  imageSrc: string,
  pixelCrop: Area,
): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      },
      "image/jpeg",
      0.92,
    );
  });
}

export function AvatarCropDialog({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
  loading = false,
  title = "Crop Photo",
  description = "Adjust the zoom and position to crop your photo.",
  aspectRatio = 1,
  cropShape = "round",
}: AvatarCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const handleCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSave = useCallback(async () => {
    if (!croppedAreaPixels) return;
    const croppedBlob = await getCroppedImage(imageSrc, croppedAreaPixels);
    onCropComplete(croppedBlob);
  }, [croppedAreaPixels, imageSrc, onCropComplete]);

  const handleReset = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  const handleZoomChange = useCallback((val: number[]) => {
    const next = val[0];
    if (next !== undefined) setZoom(next);
  }, []);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90dvh] gap-0 overflow-hidden p-0 max-md:pb-0 sm:max-w-sm [&>[aria-hidden=true]]:hidden"
      >
        <div className="px-4 pb-2 pr-10 pt-3.5">
          <DialogHeader className="gap-0.5">
            <DialogTitle className="text-base">{title}</DialogTitle>
            <DialogDescription className="text-xs">{description}</DialogDescription>
          </DialogHeader>
        </div>

        <div className="relative h-[min(32dvh,220px)] w-full overflow-hidden bg-black/40">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            cropShape={cropShape}
            showGrid={false}
            objectFit="contain"
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        <div className="flex items-center gap-2 px-4 py-2">
          <ZoomOut className="size-3.5 shrink-0 text-muted-foreground" />
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.05}
            onValueChange={handleZoomChange}
          />
          <ZoomIn className="size-3.5 shrink-0 text-muted-foreground" />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="size-8 shrink-0"
            aria-label="Reset zoom"
          >
            <RotateCcw className="size-3.5" />
          </Button>
        </div>

        <DialogFooter className="gap-2 border-t border-border px-4 py-3 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-1 size-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Photo"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
