"use client";

import { useSession } from "next-auth/react";
import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import dynamic from "next/dynamic";
import { Camera, Loader2 } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { useUpdateMyProfile } from "@/hooks/api/auth";
import { useSessionClaimsRefresh } from "@/hooks/common/auth-hooks";
import { apiClient } from "@/lib/api-client";
import { z } from "zod";

// Endpoint-only response contract for the avatar-upload API — not form or domain validation.
const uploadKeyContract = z.object({ key: z.string() });
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { resolveImageUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";

const AvatarCropDialog = dynamic(
  () => import("@/components/ui/avatar-crop-dialog").then((m) => ({ default: m.AvatarCropDialog })),
  { ssr: false },
);

const SettingsEditNameForm = dynamic(
  () => import("./settings-edit-name-form").then((m) => ({ default: m.SettingsEditNameForm })),
  { ssr: false },
);

export function SettingsProfile() {
  const { data: session } = useSession();
  const refreshSessionClaims = useSessionClaimsRefresh();

  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditingName, setIsEditingName] = useState(false);

  const updateProfile = useUpdateMyProfile();

  const isPhotoBusy = uploading;
  const displayImage = previewUrl || resolveImageUrl(session?.user?.image);
  const name = session?.user?.name || "";
  const email = session?.user?.email || "";
  const initials = name.charAt(0).toUpperCase() || "U";

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
      toast.error("Please select an image file (JPEG, PNG, GIF, or WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5 MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropImageSrc(ev.target?.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleCropComplete = useCallback(async (croppedBlob: Blob) => {
    if (!session?.user?.id) return;
    setUploading(true);
    try {
      const file = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });
      setPreviewUrl(URL.createObjectURL(croppedBlob));

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "avatars");

      const { key } = await apiClient.upload<{ key: string }>(
        "/storage/upload",
        formData,
        uploadKeyContract,
      );

      await new Promise<void>((resolve, reject) => {
        updateProfile.mutate(
          { image: key },
          {
            onSuccess: async () => {
              await refreshSessionClaims({});
              toast.success("Profile photo updated");
              setTimeout(() => setPreviewUrl(null), 1000);
              resolve();
            },
            onError: (err) => {
              toast.error(getErrorMessage(err));
              reject(err);
            },
          }
        );
      });

      setCropDialogOpen(false);
      setCropImageSrc(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  }, [session, updateProfile, refreshSessionClaims]);

  const handleRemovePhoto = useCallback(async () => {
    if (!session?.user?.id) return;
    setUploading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        updateProfile.mutate(
          { image: "" },
          {
            onSuccess: async () => { await refreshSessionClaims({}); setPreviewUrl(null); resolve(); },
            onError: (err) => reject(err),
          }
        );
      });
      toast.success("Profile photo removed");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }, [session, updateProfile, refreshSessionClaims]);

  const handleOpenFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleCloseEditName = useCallback(() => setIsEditingName(false), []);

  const handleStartEditName = useCallback(() => setIsEditingName(true), []);

  const handleCropDialogChange = useCallback((open: boolean) => {
    setCropDialogOpen(open);
    if (!open) setCropImageSrc(null);
  }, []);

  return (
    <>

      <div className="mb-4 flex items-center gap-4">
        <div className="relative group shrink-0">
          <Avatar className="h-16 w-16 ring-2 ring-border">
            <AvatarImage src={displayImage} />
            <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            disabled={isPhotoBusy}
            onClick={handleOpenFileInput}
            aria-label="Change profile photo"
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
          >
            {isPhotoBusy ? (
              <Loader2 className="h-5 w-5 text-white animate-spin" />
            ) : (
              <Camera className="h-5 w-5 text-white" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            aria-label="Upload profile photo"
            onChange={handleFileSelect}
          />
        </div>

        <div className="min-w-0 flex-1">
          <TruncatedText text={name || "—"} className="text-label font-semibold text-foreground" />
          <TruncatedText text={email ?? ""} className="text-xs text-muted-foreground" />
          <div className="flex items-center gap-2 mt-2">
            <LoadingButton
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              isPending={isPhotoBusy}
              loadingText="Uploading…"
              onClick={handleOpenFileInput}
            >
              <Camera className="h-3 w-3 mr-1" />
              Change photo
            </LoadingButton>
            {session?.user?.image && (
              <AnimatedIconButton
                icon={Trash2Icon}
                iconSize={12}
                iconClassName="mr-1"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                disabled={isPhotoBusy}
                onClick={handleRemovePhoto}
              >
                Remove
              </AnimatedIconButton>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">

        <div className="space-y-1.5">
          <Label htmlFor="display-name" className="text-label font-medium">Display name</Label>
          {isEditingName ? (
            <SettingsEditNameForm name={name} onClose={handleCloseEditName} />
          ) : (
            <button
              type="button"
              onClick={handleStartEditName}
              className={cn(
                "flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 text-sm",
                "text-left cursor-pointer hover:border-border/80 hover:bg-muted/40 transition-colors",
                !name && "text-muted-foreground"
              )}
              aria-label="Click to edit name"
            >
              {name || "Click to set name"}
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email-display" className="text-label font-medium">Email address</Label>
          <Input
            id="email-display"
            type="email"
            value={email}
            disabled
            className="bg-muted/40"
          />
          <p className="text-dense text-muted-foreground">
            Contact your admin to change email.
          </p>
        </div>
      </div>

      {cropImageSrc && (
        <AvatarCropDialog
          open={cropDialogOpen}
          onOpenChange={handleCropDialogChange}
          imageSrc={cropImageSrc}
          onCropComplete={handleCropComplete}
          loading={uploading}
        />
      )}
    </>
  );
}
