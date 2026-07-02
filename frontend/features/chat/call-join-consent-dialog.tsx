"use client";

import { Camera, Mic, Video } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function CallJoinConsentDialog({
  open,
  onOpenChange,
  onJoinWithCamera,
  onJoinAudioOnly,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoinWithCamera: () => void;
  onJoinAudioOnly: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm text-center">
        <DialogHeader className="items-center">
          <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-2">
            <Video className="h-6 w-6 text-blue-500" />
          </div>
          <DialogTitle className="text-[16px]">Ready to join?</DialogTitle>
          <p className="text-[12px] text-muted-foreground max-w-xs">
            Choose whether other participants can see your camera. You can turn it on or off
            anytime once you&apos;re in the meeting.
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-2 pt-1">
          <Button onClick={onJoinWithCamera} className="h-10 gap-2">
            <Camera className="h-4 w-4" />
            Join with camera on
          </Button>
          <Button onClick={onJoinAudioOnly} variant="outline" className="h-10 gap-2">
            <Mic className="h-4 w-4" />
            Join with camera off
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
