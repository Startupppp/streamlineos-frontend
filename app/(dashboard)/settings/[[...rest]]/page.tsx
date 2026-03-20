"use client";

import { useSession } from "next-auth/react";
import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { Switch } from "@/components/ui/switch";
import { User, Palette, Bell, Shield, Camera, Loader2, Trash2, Eye, EyeOff, Check } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { resolveImageUrl } from "@/lib/utils";
import { AvatarCropDialog } from "@/components/ui/avatar-crop-dialog";

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editName, setEditName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [compactView, setCompactView] = useState(false);

  const handleCompactToggle = (checked: boolean) => {
    setCompactView(checked);
    document.documentElement.classList.toggle("compact", checked);
    toast.success(checked ? "Compact view enabled" : "Compact view disabled");
  };

  const { data: notifPrefs } = api.hr.getNotificationPreferences.useQuery();
  const updateNotifPrefs = api.hr.updateNotificationPreferences.useMutation({
    onSuccess: () => toast.success("Notification preferences saved"),
    onError: () => toast.error("Failed to save preferences"),
  });

  const notifEmail = notifPrefs?.emailNotifications ?? true;
  const notifLeave = notifPrefs?.leaveReminders ?? true;
  const notifProject = notifPrefs?.projectUpdates ?? true;

  const toggleNotif = (key: "emailNotifications" | "leaveReminders" | "projectUpdates", value: boolean) => {
    updateNotifPrefs.mutate({ [key]: value });
  };

  const updateProfile = api.hr.updateProfile.useMutation({
    onSuccess: async () => {
      await updateSession({});
      toast.success("Profile updated successfully");
      setIsEditingName(false);
      setTimeout(() => setPreviewUrl(null), 1000);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update profile");
    },
  });

  const changePassword = api.hr.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to change password");
    },
  });

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

      await updateProfile.mutateAsync({
        userId: session.user.id,
        image: imageValue,
      });

      setCropDialogOpen(false);
      setCropImageSrc(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  }, [session, updateProfile]);

  const handleRemovePhoto = useCallback(async () => {
    if (!session?.user?.id) return;
    setUploading(true);
    try {
      await updateProfile.mutateAsync({
        userId: session.user.id,
        image: "",
      });
      setPreviewUrl(null);
    } catch {
      toast.error("Failed to remove photo");
    } finally {
      setUploading(false);
    }
  }, [session, updateProfile]);

  const handleSaveName = useCallback(() => {
    if (!session?.user?.id || !editName.trim()) return;
    updateProfile.mutate({
      userId: session.user.id,
      name: editName.trim(),
    });
  }, [session, editName, updateProfile]);

  const handleStartEditName = useCallback(() => {
    setEditName(session?.user?.name || "");
    setIsEditingName(true);
  }, [session]);

  const handleChangePassword = useCallback(() => {
    if (!newPassword || !currentPassword) return;
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    changePassword.mutate({
      currentPassword,
      newPassword,
    });
  }, [currentPassword, newPassword, confirmPassword, changePassword]);

  const passwordValid = newPassword.length >= 8 &&
    newPassword.length <= 15 &&
    /[a-z]/.test(newPassword) &&
    /[A-Z]/.test(newPassword) &&
    /\d/.test(newPassword) &&
    /[@$!%*?&]/.test(newPassword);

  const displayImage = previewUrl || resolveImageUrl(session?.user?.image);
  const isBusy = uploading || updateProfile.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account preferences and settings."
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
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
                  <p className="text-xs text-muted-foreground">Email cannot be changed. Contact admin for assistance.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Appearance</CardTitle>
              <CardDescription>Customize how the application looks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Compact View</p>
                  <p className="text-sm text-muted-foreground">
                    Use a more compact layout for lists and tables.
                  </p>
                </div>
                <Switch id="compact-view" aria-label="Toggle compact view" checked={compactView} onCheckedChange={handleCompactToggle} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Notification Preferences</CardTitle>
              <CardDescription>Choose what notifications you receive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive updates about your projects via email.
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  aria-label="Toggle email notifications"
                  checked={notifEmail}
                  onCheckedChange={(v) => toggleNotif("emailNotifications", v)}
                  disabled={updateNotifPrefs.isPending}
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Leave Reminders</p>
                  <p className="text-sm text-muted-foreground">
                    Get reminded about pending leave approvals.
                  </p>
                </div>
                <Switch
                  id="leave-reminders"
                  aria-label="Toggle leave reminders"
                  checked={notifLeave}
                  onCheckedChange={(v) => toggleNotif("leaveReminders", v)}
                  disabled={updateNotifPrefs.isPending}
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Project Updates</p>
                  <p className="text-sm text-muted-foreground">
                    Notifications when tickets are assigned or updated.
                  </p>
                </div>
                <Switch
                  id="project-updates"
                  aria-label="Toggle project updates"
                  checked={notifProject}
                  onCheckedChange={(v) => toggleNotif("projectUpdates", v)}
                  disabled={updateNotifPrefs.isPending}
                />
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                Preferences are saved to your account and persist across sessions.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Change Password</CardTitle>
              <CardDescription>Update your account password. Use a strong, unique password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="8–15 characters"
                    maxLength={15}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {newPassword && (() => {
                  let score = 0;
                  if (newPassword.length >= 8) score++;
                  if (newPassword.length >= 12) score++;
                  if (/[A-Z]/.test(newPassword)) score++;
                  if (/[a-z]/.test(newPassword)) score++;
                  if (/\d/.test(newPassword)) score++;
                  if (/[@$!%*?&]/.test(newPassword)) score++;
                  const level = score <= 2 ? 1 : score <= 4 ? 2 : score <= 5 ? 3 : 4;
                  const label = level <= 1 ? "Weak" : level <= 2 ? "Medium" : level <= 3 ? "Strong" : "Very Strong";
                  const barColor = level <= 1 ? "bg-red-500" : level <= 2 ? "bg-yellow-500" : level <= 3 ? "bg-green-500" : "bg-emerald-500";
                  const textColor = level <= 1 ? "text-red-500" : level <= 2 ? "text-yellow-500" : "text-green-500";
                  return (
                    <div className="space-y-1.5">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((l) => (
                          <div key={l} className={`h-1.5 flex-1 rounded-full transition-colors ${l <= level ? barColor : "bg-muted"}`} />
                        ))}
                      </div>
                      <p className={`text-xs ${textColor}`}>{label}</p>
                    </div>
                  );
                })()}
                {newPassword && (
                  <div className="space-y-1 text-xs">
                    <p className={newPassword.length >= 8 ? "text-emerald-500" : "text-muted-foreground"}>
                      {newPassword.length >= 8 ? "✓" : "○"} At least 8 characters
                    </p>
                    <p className={newPassword.length <= 15 ? "text-emerald-500" : "text-destructive"}>
                      {newPassword.length <= 15 ? "✓" : "✗"} At most 15 characters
                    </p>
                    <p className={/[A-Z]/.test(newPassword) ? "text-emerald-500" : "text-muted-foreground"}>
                      {/[A-Z]/.test(newPassword) ? "✓" : "○"} One uppercase letter
                    </p>
                    <p className={/[a-z]/.test(newPassword) ? "text-emerald-500" : "text-muted-foreground"}>
                      {/[a-z]/.test(newPassword) ? "✓" : "○"} One lowercase letter
                    </p>
                    <p className={/\d/.test(newPassword) ? "text-emerald-500" : "text-muted-foreground"}>
                      {/\d/.test(newPassword) ? "✓" : "○"} One number
                    </p>
                    <p className={/[@$!%*?&]/.test(newPassword) ? "text-emerald-500" : "text-muted-foreground"}>
                      {/[@$!%*?&]/.test(newPassword) ? "✓" : "○"} One special character (@$!%*?&)
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleChangePassword}
                  disabled={
                    changePassword.isPending ||
                    !currentPassword ||
                    !passwordValid ||
                    newPassword !== confirmPassword
                  }
                >
                  {changePassword.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    "Change Password"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
    </div>
  );
}
