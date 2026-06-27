"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Check, ChevronRight, Hash, Loader2, Search, Users, X } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useChatOrgUsers, useCreateGroupChannel } from "@/lib/api/hooks";
import { cn, resolveImageUrl } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { getInitials } from "./chat-helpers";

type OrgUserItem = { id: string; name?: string | null; email?: string | null; image?: string | null };

interface SelectedUserBadgeProps {
  id: string;
  name?: string | null;
  onRemove: (id: string) => void;
}

function SelectedUserBadge({ id, name, onRemove }: SelectedUserBadgeProps) {
  const handleRemove = useCallback(() => onRemove(id), [id, onRemove]);
  return (
    <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-600 rounded-full px-2 py-0.5 text-[11px] font-medium">
      {name?.split("")[0]}
      <button onClick={handleRemove} className="hover:bg-blue-500/20 rounded-full p-0.5">
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

interface UserSelectItemProps {
  user: OrgUserItem;
  selected: boolean;
  onToggle: (id: string) => void;
}

function UserSelectItem({ user, selected, onToggle }: UserSelectItemProps) {
  const handleClick = useCallback(() => onToggle(user.id), [user.id, onToggle]);
  return (
    <button
      onClick={handleClick}
      className={cn(
"w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors",
        selected &&"bg-blue-500/5"
      )}
    >
      <div className={cn("h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all", selected ?"bg-blue-500 border-blue-500 text-white" :"border-border/60")}>
        {selected && <Check className="h-3 w-3" />}
      </div>
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={resolveImageUrl(user.image)} />
        <AvatarFallback className="text-[9px]">{getInitials(user.name)}</AvatarFallback>
      </Avatar>
      <p className="text-[13px] font-medium truncate flex-1 text-left">{user.name}</p>
    </button>
  );
}

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
  const { data: orgUsers } = useChatOrgUsers();
  const createGroup = useCreateGroupChannel();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [step, setStep] = useState<"info" |"members">("info");

  const handleOpenAvatarInput = useCallback(() => { avatarInputRef.current?.click(); }, []);
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,""));
  }, []);
  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value), []);
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value), []);
  const handleGoToMembers = useCallback(() => setStep("members"), []);
  const handleGoToInfo = useCallback(() => setStep("info"), []);

  const filteredUsers = useMemo(() => {
    if (!orgUsers) return [];
    if (!search) return orgUsers;
    const q = search.toLowerCase();
    return orgUsers.filter(
      (u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  }, [orgUsers, search]);

  const toggleUser = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder","chat-avatars");
      const data = await apiClient.upload<{ url?: string }>("/storage/upload", formData);
      if (data.url) setAvatarUrl(data.url);
      else toast.error("Upload failed");
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setUploadingAvatar(false); if (avatarInputRef.current) avatarInputRef.current.value =""; }
  };

  const handleCreate = async () => {
    if (!name.trim() || selectedIds.size === 0) return;
    try {
      const channel = await createGroup.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
        memberIds: Array.from(selectedIds),
      });
      onCreated(channel.id);
      onOpenChange(false);
      setName("");
      setDescription("");
      setAvatarUrl("");
      setSelectedIds(new Set());
      setSearch("");
      setStep("info");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const resetAndClose = (open: boolean) => {
    if (!open) {
      setStep("info");
      setName("");
      setDescription("");
      setAvatarUrl("");
      setSelectedIds(new Set());
      setSearch("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" title="New Channel" aria-label="New Channel">
            <Users className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3">
          <DialogTitle className="text-[16px]">
            {step ==="info" ?"Create Channel" :"Add Members"}
          </DialogTitle>
        </DialogHeader>

        {step ==="info" ? (
          <div className="px-4 pb-4 space-y-4">
            <div className="flex justify-center">
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <button
                type="button"
                onClick={handleOpenAvatarInput}
                disabled={uploadingAvatar}
                className="relative group"
              >
                {avatarUrl ? (
                  <div className="relative h-16 w-16 rounded-xl overflow-hidden border-2 border-border/40">
                    <Image src={resolveImageUrl(avatarUrl) ??""} alt="Channel avatar" fill unoptimized className="object-cover" />
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded-xl bg-muted/40 border-2 border-dashed border-border/60 flex items-center justify-center">
                    {uploadingAvatar ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <Camera className="h-5 w-5 text-muted-foreground/50" />
                    )}
                  </div>
                )}
                <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-4 w-4 text-white" />
                </div>
              </button>
            </div>
            <div>
              <Label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">
                Channel name
              </Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                <Input
                  value={name}
                  onChange={handleNameChange}
                  placeholder="e.g. design-team"
                  className="pl-9 h-9 bg-muted/30 border-border/30"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <Label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">
                Description <span className="text-muted-foreground/50">(optional)</span>
              </Label>
              <Input
                value={description}
                onChange={handleDescriptionChange}
                placeholder="What's this channel about?"
                className="h-9 bg-muted/30 border-border/30"
              />
            </div>
            <Button
              onClick={handleGoToMembers}
              disabled={!name.trim()}
              className="w-full h-9"
            >
              Next: Add Members
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        ) : (
          <div className="pb-4">
            <div className="px-4 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  placeholder="Search people..."
                  value={search}
                  onChange={handleSearchChange}
                  className="pl-9 h-9 bg-muted/30 border-border/30"
                  autoFocus
                />
              </div>
              {selectedIds.size > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {Array.from(selectedIds).map((id) => {
                    const user = orgUsers?.find((u) => u.id === id);
                    return (
                      <SelectedUserBadge
                        key={id}
                        id={id}
                        name={user?.name}
                        onRemove={toggleUser}
                      />
                    );
                  })}
                </div>
              )}
            </div>
            <ScrollArea className="h-[240px] border-t border-border/30">
              <div className="p-1">
                {filteredUsers.map((user) => (
                  <UserSelectItem
                    key={user.id}
                    user={user}
                    selected={selectedIds.has(user.id)}
                    onToggle={toggleUser}
                  />
                ))}
              </div>
            </ScrollArea>
            <div className="px-4 pt-3 flex gap-2">
              <Button variant="outline" onClick={handleGoToInfo} className="flex-1 h-9">
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={selectedIds.size === 0 || createGroup.isPending}
                className="flex-1 h-9"
              >
                {createGroup.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Creating...
                  </>
                ) : (
                  `Create with ${selectedIds.size} member${selectedIds.size !== 1 ?"s" :""}`
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
