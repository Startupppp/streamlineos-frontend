"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Hash, ImageIcon, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatDistanceToNow } from "date-fns";
import { useChatChannel, useChatOnlineUsers, useUpdateChannel } from "@/lib/hooks/trpc-hooks";
import { cn, resolveImageUrl } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { getInitials } from "./chat-helpers";

export function ChannelInfoPanel({
  channelId,
  currentUserId,
  onClose,
}: {
  channelId: number;
  currentUserId: string;
  onClose: () => void;
}) {
  const { data: channel } = useChatChannel(channelId);
  const { data: onlineUsers } = useChatOnlineUsers();
  const updateChannel = useUpdateChannel();
  const onlineUserIds = useMemo(
    () => new Set(onlineUsers?.map((u: { userId: string }) => u.userId) ?? []),
    [onlineUsers]
  );

  const isAdmin = channel?.members?.some(
    (m) => m.user?.id === currentUserId && m.role === "ADMIN"
  );
  const isGroup = channel?.type === "GROUP";

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const editAvatarRef = useRef<HTMLInputElement>(null);

  const handleOpenAvatarInput = useCallback(() => { editAvatarRef.current?.click(); }, []);
  const handleCancelEdit = useCallback(() => setEditing(false), []);
  const handleEditNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value), []);
  const handleEditDescChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEditDesc(e.target.value), []);

  const startEditing = () => {
    setEditName(channel?.name ?? "");
    setEditDesc(channel?.description ?? "");
    setEditAvatar(channel?.avatarUrl ?? "");
    setEditing(true);
  };

  const handleEditAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "chat-avatars");
      const data = await apiClient.upload<{ url?: string }>("/storage/upload", formData);
      if (data.url) setEditAvatar(data.url);
      else toast.error("Upload failed");
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setUploadingAvatar(false); if (editAvatarRef.current) editAvatarRef.current.value = ""; }
  };

  const handleSaveEdit = async () => {
    try {
      await updateChannel.mutateAsync({
        channelId,
        name: editName.trim() || undefined,
        description: editDesc.trim(),
        avatarUrl: editAvatar,
      });
      setEditing(false);
      toast.success("Channel updated");
    } catch (error) { toast.error(getErrorMessage(error)); }
  };

  const otherMember =
    channel?.type === "DIRECT"
      ? channel.members?.find((m) => m.user?.id !== currentUserId)?.user
      : null;
  const displayName =
    channel?.type === "DIRECT" ? otherMember?.name ?? "Unknown" : channel?.name ?? "Channel";

  return (
    <div className="flex flex-col h-full w-80">
      <div className="h-[56px] px-4 border-b border-border/40 flex items-center justify-between shrink-0">
        <h3 className="text-[14px] font-bold">Details</h3>
        <div className="flex items-center gap-1">
          {isGroup && isAdmin && !editing && (
            <button onClick={startEditing} className="p-1.5 hover:bg-muted rounded-lg" title="Edit channel" aria-label="Edit channel">
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg" aria-label="Close">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {editing ? (
            <div className="space-y-4 mb-6">
              <div className="flex justify-center">
                <input ref={editAvatarRef} type="file" accept="image/*" onChange={handleEditAvatarUpload} className="hidden" aria-label="Upload channel avatar" />
                <button type="button" onClick={handleOpenAvatarInput} disabled={uploadingAvatar} className="relative group">
                  {editAvatar ? (
                    <div className="relative h-20 w-20 rounded-2xl overflow-hidden border-2 border-border/40">
                      <Image src={resolveImageUrl(editAvatar) ?? ""} alt="Avatar" fill unoptimized className="object-cover" />
                    </div>
                  ) : (
                    <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue/10 to-blue/5 flex items-center justify-center border border-blue/10">
                      {uploadingAvatar ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <ImageIcon className="h-6 w-6 text-blue/40" />}
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                </button>
              </div>
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Name</Label>
                <Input value={editName} onChange={handleEditNameChange} className="h-8 text-[13px] bg-muted/30" />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Description</Label>
                <Input value={editDesc} onChange={handleEditDescChange} placeholder="Add a description..." className="h-8 text-[13px] bg-muted/30" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancelEdit} className="flex-1 h-8 text-[12px]">Cancel</Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={updateChannel.isPending || !editName.trim()} className="flex-1 h-8 text-[12px] bg-blue-500 hover:bg-blue-500/90 text-white">
                  {updateChannel.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center mb-6">
              {channel?.type === "DIRECT" ? (
                <Avatar className="h-20 w-20 mb-3 border-2 border-border/30 shadow-md">
                  <AvatarImage src={resolveImageUrl(otherMember?.image)} />
                  <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-600">
                    {getInitials(otherMember?.name)}
                  </AvatarFallback>
                </Avatar>
              ) : channel?.avatarUrl ? (
                <div className="relative h-20 w-20 rounded-2xl overflow-hidden mb-3 border-2 border-border/30 shadow-md">
                  <Image src={resolveImageUrl(channel.avatarUrl) ?? ""} alt={channel.name} fill unoptimized className="object-cover" />
                </div>
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue/10 to-blue/5 flex items-center justify-center mb-3 border border-blue/10">
                  <Hash className="h-8 w-8 text-blue" />
                </div>
              )}
              <h4 className="text-[17px] font-bold">{displayName}</h4>
              {channel?.type === "DIRECT" ? (
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {otherMember
                    ? onlineUserIds.has(otherMember.id)
                      ? "Online"
                      : "Offline"
                    : ""}
                </p>
              ) : (
                channel?.description && (
                  <p className="text-[12px] text-muted-foreground mt-1 max-w-[240px]">
                    {channel.description}
                  </p>
                )
              )}
            </div>
          )}

          <div>
            <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">
              Members ({channel?.members?.length ?? 0})
            </h5>
            <div className="space-y-0.5">
              {channel?.members?.map((m) => {
                const isOnline = onlineUserIds.has(m.user?.id ?? "");
                const isYou = m.user?.id === currentUserId;
                return (
                  <div
                    key={m.user?.id}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={resolveImageUrl(m.user?.image)} />
                        <AvatarFallback className="text-[10px] font-medium">
                          {getInitials(m.user?.name)}
                        </AvatarFallback>
                      </Avatar>
                      {isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">
                        {m.user?.name}
                        {isYou && <span className="text-muted-foreground font-normal"> (you)</span>}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{m.user?.email}</p>
                    </div>
                    {m.role === "ADMIN" && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-blue-500/30 text-blue-600">
                        Admin
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {channel?.createdAt && (
            <div className="mt-6 pt-4 border-t border-border/30">
              <p className="text-[11px] text-muted-foreground/50 text-center">
                {channel.type === "GROUP"
                  ? `Created ${formatDistanceToNow(new Date(channel.createdAt), { addSuffix: true })}`
                  : `Started ${formatDistanceToNow(new Date(channel.createdAt), { addSuffix: true })}`}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
