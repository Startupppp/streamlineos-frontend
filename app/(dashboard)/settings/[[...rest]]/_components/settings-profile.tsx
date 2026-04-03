"use client";

import { useSession } from "next-auth/react";
import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarCropDialog } from "@/components/ui/avatar-crop-dialog";
import { Camera, Loader2, Trash2, Check } from "lucide-react";
import { useUpdateProfile } from "@/lib/api/hooks/hr";
import { toast } from "sonner";
import { resolveImageUrl } from "@/lib/utils";

export function SettingsProfile() {
  const { data: session, update: updateSession } = useSession();

  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editName, setEditName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

  const updateProfile = useUpdateProfile();

  const isBusy = uploading || updateProfile.isPending;
  const displayImage = previewUrl || resolveImageUrl(session?.user?.image);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please select an image file (JPEG, PNG, GIF, or WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
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

      const res = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const { url, key } = await res.json();
      const imageValue = url || key;

      await new Promise<void>((resolve, reject) => {
        updateProfile.mutate(
          { userId: session.user.id, image: imageValue },
          {
            onSuccess: async () => {
              await updateSession({});
              toast.success("Profile updated successfully");
              setIsEditingName(false);
              setTimeout(() => setPreviewUrl(null), 1000);
              resolve();
            },
            onError: (err) => {
              toast.error(err instanceof Error ? err.message : "Failed to update profile");
              reject(err);
            },
          }
        );
      });

      setCropDialogOpen(false);
      setCropImageSrc(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  }, [session, updateProfile, updateSession]);

  const handleRemovePhoto = useCallback(async () => {
    if (!session?.user?.id) return;
    setUploading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        updateProfile.mutate(
          { userId: session.user.id, image: "" },
          {
            onSuccess: async () => {
              await updateSession({});
              setPreviewUrl(null);
              resolve();
            },
            onError: (err) => reject(err),
          }
        );
      });
    } catch {
      toast.error("Failed to remove photo");
    } finally {
      setUploading(false);
    }
  }, [session, updateProfile, updateSession]);

  const handleStartEditName = useCallback(() => {
    setEditName(session?.user?.name || "");
    setIsEditingName(true);
  }, [session]);

  const handleSaveName = useCallback(() => {
    if (!session?.user?.id || !editName.trim()) return;
    updateProfile.mutate(
      { userId: session.user.id, name: editName.trim() },
      {
        onSuccess: async () => {
          await updateSession({});
          toast.success("Profile updated successfully");
          setIsEditingName(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to update profile");
        },
      }
    );
  }, [session, editName, updateProfile, updateSession]);

  return (
    <>
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Profile Information</CardTitle>
          <CardDescription>Update your profile details and photo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="h-20 w-20 border-2 border-border">
                <AvatarImage src={displayImage} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary font-semibold">
                  {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Change profile photo"
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
              >
                {isBusy ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">{session?.user?.name || "User"}</h3>
              <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isBusy ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-1" />
                      Change Photo
                    </>
                  )}
                </Button>
                {session?.user?.image && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isBusy}
                    onClick={handleRemovePhoto}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">Full Name</Label>
              {isEditingName ? (
                <div className="flex gap-2">
                  <Input
                    id="name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveName}
                    disabled={updateProfile.isPending || !editName.trim()}
                    className="shrink-0"
                  >
                    {updateProfile.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingName(false)}
                    className="shrink-0"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div
                  className="flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 py-1 text-sm cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={handleStartEditName}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleStartEditName(); }}
                  aria-label="Click to edit name"
                >
                  {session?.user?.name || "Click to set name"}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={session?.user?.email || ""}
                disabled
                className="bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed. Contact admin for assistance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {cropImageSrc && (
        <AvatarCropDialog
          open={cropDialogOpen}
          onOpenChange={(open) => {
            setCropDialogOpen(open);
            if (!open) setCropImageSrc(null);
          }}
          imageSrc={cropImageSrc}
          onCropComplete={handleCropComplete}
          loading={uploading}
        />
      )}
    </>
  );
}
