"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAdoptSignSignature } from "@/hooks/api/sign/public";

interface SignaturePadDialogProps {
  token: string;
  assetType: "signature" | "initials";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdopted: () => void;
}

export function SignaturePadDialog({ token, assetType, open, onOpenChange, onAdopted }: SignaturePadDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const hasDrawn = useRef(false);
  const [typedText, setTypedText] = useState("");
  const adopt = useAdoptSignSignature(token);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    isDrawing.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    const { x, y } = getPos(e);
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0b1220";
    ctx.lineTo(x, y);
    ctx.stroke();
    hasDrawn.current = true;
  }

  function handlePointerUp() {
    isDrawing.current = false;
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn.current = false;
  }

  async function handleSaveDrawn() {
    if (!hasDrawn.current || !canvasRef.current) {
      toast.error("Please draw your signature first");
      return;
    }
    try {
      await adopt.mutateAsync({ assetType, method: "drawn", imageDataUrl: canvasRef.current.toDataURL("image/png") });
      onAdopted();
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleSaveTyped() {
    if (!typedText.trim()) {
      toast.error("Please type your name first");
      return;
    }
    try {
      await adopt.mutateAsync({ assetType, method: "typed", typedText: typedText.trim(), typedFontStyle: "signature" });
      onAdopted();
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{assetType === "initials" ? "Add your initials" : "Adopt your signature"}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="draw">
          <TabsList>
            <TabsTrigger value="draw">Draw</TabsTrigger>
            <TabsTrigger value="type">Type</TabsTrigger>
          </TabsList>
          <TabsContent value="draw" className="space-y-3">
            <canvas
              ref={canvasRef}
              width={400}
              height={160}
              className="w-full rounded-lg border border-border bg-white touch-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
            <div className="flex justify-between gap-2">
              <Button variant="outline" size="sm" onClick={handleClear}>
                Clear
              </Button>
              <LoadingButton size="sm" onClick={handleSaveDrawn} isPending={adopt.isPending} loadingText="Saving…">
                Use this signature
              </LoadingButton>
            </div>
          </TabsContent>
          <TabsContent value="type" className="space-y-3">
            <Input
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder="Type your full name"
              className="text-2xl font-serif h-16 text-center italic"
            />
            <LoadingButton className="w-full" onClick={handleSaveTyped} isPending={adopt.isPending} loadingText="Saving…">
              Use this signature
            </LoadingButton>
          </TabsContent>
        </Tabs>
        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}
