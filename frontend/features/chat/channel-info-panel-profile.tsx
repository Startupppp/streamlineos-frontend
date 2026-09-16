"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { useUpdateChannel } from "@/hooks/api";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const storageUploadContract = lazyContract(() =>
  import("@/hooks/api/chat-extra-schema").then((m) => m.storageUploadContract),
);
import { getErrorMessage } from "@/lib/get-error-message";
import { resolveImageUrl } from "@/lib/utils";
import type { ChatChannelDetailWire } from "@/hooks/api/chat-extra-schema";
import { ChannelAvatar } from "./channel-avatar";
import { resolveDirectPartner } from "./channel-member-lookup";
import { TruncatedText } from "@/components/ui/truncated-text";

interface ChannelInfoPanelProfileProps {
  channel: ChatChannelDetailWire | undefined;
  currentUserId: string;
  isAdmin: boolean;
  onlineUserIds: Set<string>;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
}

export function ChannelInfoPanelProfile({
  channel,
  currentUserId,
  isAdmin,
  onlineUserIds,
  editing,
  onEditingChange,
}: ChannelInfoPanelProfileProps) {
  const updateChannel = useUpdateChannel();
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const editAvatarRef = useRef<HTMLInputElement>(null);
  const quickAvatarRef = useRef<HTMLInputElement>(null);
  const wasEditingRef = useRef(false);
  const otherMember =
    channel?.type === "DIRECT" ? resolveDirectPartner(channel.members, currentUserId) : null;
  const displayName =
    channel?.type === "DIRECT"
      ? (otherMember?.name ?? "Unknown")
      : (channel?.name ?? "Channel");

  useEffect(() => {
    if (editing && !wasEditingRef.current) {
      setEditName(channel?.name ?? "");
      setEditDesc(channel?.description ?? "");
      setEditAvatar(channel?.avatarUrl ?? "");
    }
    wasEditingRef.current = editing;
  }, [channel?.avatarUrl, channel?.description, channel?.name, editing]);

  const handleOpenAvatarInput = useCallback(() => {
    editAvatarRef.current?.click();
  }, []);
  const handleOpenQuickAvatarInput = useCallback(() => {
    quickAvatarRef.current?.click();
  }, []);
  const handleCancelEdit = useCallback(() => onEditingChange(false), [onEditingChange]);
  const handleEditNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setEditName(event.target.value),
    [],
  );
  const handleEditDescChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setEditDesc(event.target.value),
    [],
  );

  const handleAvatarUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>, saveImmediately = false) => {
      const file = event.target.files?.[0];
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
        const data = await apiClient.upload<{ key: string }>("/storage/upload", formData, storageUploadContract);
        if (!data.key) {
          toast.error("Upload failed");
          return;
        }
        if (saveImmediately && channel) {
          await updateChannel.mutateAsync({ channelId: channel.id, avatarUrl: data.key });
          toast.success("Channel photo updated");
        } else {
          setEditAvatar(data.key);
        }
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setUploadingAvatar(false);
        if (editAvatarRef.current) editAvatarRef.current.value = "";
        if (quickAvatarRef.current) quickAvatarRef.current.value = "";
      }
    },
    [channel, updateChannel],
  );

  const handleSaveEdit = useCallback(async () => {
    if (!channel) return;
    try {
      await updateChannel.mutateAsync({
        channelId: channel.id,
        name: editName.trim() || undefined,
        description: editDesc.trim(),
        avatarUrl: editAvatar,
      });
      onEditingChange(false);
      toast.success("Channel updated");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [channel, editAvatar, editDesc, editName, onEditingChange, updateChannel]);

  if (editing) {
    return (
      <div className="space-y-4 mb-6">
        <div className="flex justify-center">
          <input
            ref={editAvatarRef}
            type="file"
            accept="image/*"
            onChange={(event) => handleAvatarUpload(event)}
            className="hidden"
            aria-label="Upload channel avatar"
          />
          <button
            type="button"
            onClick={handleOpenAvatarInput}
            disabled={uploadingAvatar}
            className="relative group"
          >
            {editAvatar ? (
              <div className="relative h-20 w-20 rounded-2xl overflow-hidden border-2 border-border/40">
                <Image
                  src={resolveImageUrl(editAvatar) ?? ""}
                  alt="Avatar"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue/10 to-blue/5 flex items-center justify-center border border-blue/10">
                {uploadingAvatar ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-blue/40" />
                )}
              </div>
            )}
            <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="h-5 w-5 text-white" />
            </div>
          </button>
        </div>
        <div>
          <Label className="text-dense font-medium text-muted-foreground mb-1 block">Name</Label>
          <Input value={editName} onChange={handleEditNameChange} className="text-label bg-muted/30" />
        </div>
        <div>
          <Label className="text-dense font-medium text-muted-foreground mb-1 block">Description</Label>
          <Input value={editDesc} onChange={handleEditDescChange} placeholder="Add a description..." className="text-label bg-muted/30" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCancelEdit} className="flex-1 h-8 text-xs">Cancel</Button>
          <LoadingButton size="sm" onClick={handleSaveEdit} disabled={!editName.trim()} isPending={updateChannel.isPending} className="flex-1 h-8 text-xs">Save</LoadingButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center mb-6">
      <input
        ref={quickAvatarRef}
        type="file"
        accept="image/*"
        onChange={(event) => handleAvatarUpload(event, true)}
        className="hidden"
        aria-label="Upload channel photo"
      />
      {channel?.type === "DIRECT" ? (
        <div className="mb-3">
          <ChannelAvatar type={channel.type} otherMember={otherMember} className="h-20 w-20" rounded="2xl" />
        </div>
      ) : (
        <button
          type="button"
          onClick={isAdmin ? handleOpenQuickAvatarInput : undefined}
          disabled={!isAdmin || uploadingAvatar}
          className="relative group mb-3 disabled:cursor-default"
          title={isAdmin ? "Change channel photo" : undefined}
          aria-label={isAdmin ? "Change channel photo" : undefined}
        >
          <ChannelAvatar type={channel?.type} name={channel?.name} avatarUrl={channel?.avatarUrl} className="h-20 w-20" rounded="2xl" iconClassName="h-8 w-8" />
          {isAdmin ? (
            <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {uploadingAvatar ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
            </div>
          ) : null}
        </button>
      )}
      <TruncatedText text={displayName} className="text-base font-bold max-w-[200px]" />
      {channel?.type === "DIRECT" ? (
        <p className="text-xs text-muted-foreground mt-0.5">
          {otherMember ? (onlineUserIds.has(otherMember.id) ? "Online" : "Offline") : ""}
        </p>
      ) : channel?.description ? (
        <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">{channel.description}</p>
      ) : null}
    </div>
  );
}
