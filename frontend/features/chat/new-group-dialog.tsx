"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogBody,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Camera,
  ChevronRight,
  Globe,
  Hash,
  Lock,
  Loader2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreateGroupChannel,
  useCreatePublicChannel,
  useCreatePrivateChannel,
} from "@/hooks/api";
import { cn, resolveImageUrl } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { MemberPicker } from "@/components/shared";
import { LoadingButton } from "@/components/ui/loading-button";

type ChannelKind = "GROUP" | "PUBLIC" | "PRIVATE";

const CHANNEL_KINDS: {
  value: ChannelKind;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "GROUP",
    label: "Group",
    description: "Private group for invited members only",
    icon: <Users className="h-4 w-4" />,
  },
  {
    value: "PUBLIC",
    label: "Public",
    description: "Anyone in the org can find and join",
    icon: <Globe className="h-4 w-4" />,
  },
  {
    value: "PRIVATE",
    label: "Private",
    description: "Invite-only, hidden from directory",
    icon: <Lock className="h-4 w-4" />,
  },
];

export function NewGroupDialog({
  open,
  onOpenChange,
  onCreated,
  hideTrigger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (channelId: number) => void;
  hideTrigger?: boolean;
}) {
  const createGroup = useCreateGroupChannel();
  const createPublic = useCreatePublicChannel();
  const createPrivate = useCreatePrivateChannel();
  const [channelKind, setChannelKind] = useState<ChannelKind>("GROUP");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [step, setStep] = useState<"info" | "members">("info");

  const handleOpenAvatarInput = useCallback(() => {
    avatarInputRef.current?.click();
  }, []);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(
      e.target.value
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, ""),
    );
  }, []);

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value),
    [],
  );

  const handleGoToMembers = useCallback(() => setStep("members"), []);
  const handleGoToInfo = useCallback(() => setStep("info"), []);

  const handleToggleMember = useCallback((userId: string) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "chat-avatars");
      const data = await apiClient.upload<{ url?: string }>("/storage/upload", formData);
      if (data.url) setAvatarUrl(data.url);
      else toast.error("Upload failed");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const isPending =
    createGroup.isPending || createPublic.isPending || createPrivate.isPending;

  const handleCreate = async () => {
    if (!name.trim() || selectedIds.length === 0) return;
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      avatarUrl: avatarUrl || undefined,
      memberIds: selectedIds,
    };
    try {
      let channel;
      if (channelKind === "PUBLIC") {
        channel = await createPublic.mutateAsync(payload);
      } else if (channelKind === "PRIVATE") {
        channel = await createPrivate.mutateAsync(payload);
      } else {
        channel = await createGroup.mutateAsync(payload);
      }
      onCreated(channel.id);
      onOpenChange(false);
      setName("");
      setDescription("");
      setAvatarUrl("");
      setSelectedIds([]);
      setStep("info");
      setChannelKind("GROUP");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const resetAndClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStep("info");
      setName("");
      setDescription("");
      setAvatarUrl("");
      setSelectedIds([]);
      setChannelKind("GROUP");
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            title="New Channel"
            aria-label="New Channel"
          >
            <Users className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3">
          <DialogTitle className="text-[16px]">
            {step === "info" ? "Create Channel" : "Add Members"}
          </DialogTitle>
        </DialogHeader>

        {step === "info" ? (
          <DialogBody className="space-y-4 px-4 py-4">
            <div className="grid grid-cols-3 gap-2">
              {CHANNEL_KINDS.map((kind) => (
                <button
                  key={kind.value}
                  type="button"
                  onClick={() => setChannelKind(kind.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-all",
                    channelKind === kind.value
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border/40 text-muted-foreground hover:border-border hover:bg-muted/30",
                  )}
                >
                  {kind.icon}
                  <span className="text-[12px] font-semibold">{kind.label}</span>
                  <span className="text-[10px] leading-tight opacity-70">
                    {kind.description}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex justify-center">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={handleOpenAvatarInput}
                disabled={uploadingAvatar}
                className="group relative"
              >
                {avatarUrl ? (
                  <div className="relative h-16 w-16 overflow-hidden rounded-xl border-2 border-border/40">
                    <Image
                      src={resolveImageUrl(avatarUrl) ?? ""}
                      alt="Channel avatar"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-border/60 bg-muted/40">
                    {uploadingAvatar ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <Camera className="h-5 w-5 text-muted-foreground/50" />
                    )}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="h-4 w-4 text-white" />
                </div>
              </button>
            </div>

            <div>
              <Label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">
                Channel name
              </Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  value={name}
                  onChange={handleNameChange}
                  placeholder="e.g. design-team"
                  className="h-9 border-border/30 bg-muted/30 pl-9"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">
                Description{" "}
                <span className="text-muted-foreground/50">(optional)</span>
              </Label>
              <Input
                value={description}
                onChange={handleDescriptionChange}
                placeholder="What's this channel about?"
                className="h-9 border-border/30 bg-muted/30"
              />
            </div>

            <Button onClick={handleGoToMembers} disabled={!name.trim()} className="h-9 w-full">
              Next: Add Members
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </DialogBody>
        ) : (
          <>
            <DialogBody className="space-y-3 px-4 py-4">
              <Label className="text-[12px] font-medium text-muted-foreground">Members</Label>
              <MemberPicker
                mode="multi"
                values={selectedIds}
                onToggle={handleToggleMember}
                placeholder="Search and add people…"
              />
            </DialogBody>
            <div className="flex shrink-0 gap-2 border-t border-border px-4 py-3">
              <Button variant="outline" onClick={handleGoToInfo} className="h-9 flex-1">
                Back
              </Button>
              <LoadingButton
                onClick={handleCreate}
                disabled={selectedIds.length === 0}
                isPending={isPending}
                loadingText="Creating…"
                className="h-9 flex-1"
              >
                {`Create with ${selectedIds.length} member${selectedIds.length !== 1 ? "s" : ""}`}
              </LoadingButton>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
