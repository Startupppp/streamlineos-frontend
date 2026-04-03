"use client";

import { useState, useMemo, useRef } from "react";
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
import { useChatOrgUsers, useCreateGroupChannel } from "@/lib/hooks/trpc-hooks";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getInitials } from "./chat-helpers";

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
  const [step, setStep] = useState<"info" | "members">("info");

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
      formData.append("folder", "chat-avatars");
      const res = await fetch("/api/storage/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) setAvatarUrl(data.url);
      else toast.error("Upload failed");
    } catch { toast.error("Upload failed"); }
    finally { setUploadingAvatar(false); if (avatarInputRef.current) avatarInputRef.current.value = ""; }
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
    } catch {
      toast.error("Failed to create channel");
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
            {step === "info" ? "Create Channel" : "Add Members"}
          </DialogTitle>
        </DialogHeader>

        {step === "info" ? (
          <div className="px-4 pb-4 space-y-4">
            <div className="flex justify-center">
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="relative group"
              >
                {avatarUrl ? (
                  <div className="relative h-16 w-16 rounded-xl overflow-hidden border-2 border-border/40">
                    <Image src={resolveImageUrl(avatarUrl) ?? ""} alt="Channel avatar" fill unoptimized className="object-cover" />
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
                  onChange={(e) =>
                    setName(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))
                  }
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
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this channel about?"
                className="h-9 bg-muted/30 border-border/30"
              />
            </div>
            <Button
              onClick={() => setStep("members")}
              disabled={!name.trim()}
              className="w-full bg-[#bd882c] hover:bg-[#bd882c]/90 text-white h-9"
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
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 bg-muted/30 border-border/30"
                  autoFocus
                />
              </div>
              {selectedIds.size > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {Array.from(selectedIds).map((id) => {
                    const user = orgUsers?.find((u) => u.id === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 bg-[#bd882c]/10 text-[#bd882c] rounded-full px-2 py-0.5 text-[11px] font-medium"
                      >
                        {user?.name?.split(" ")[0]}
                        <button onClick={() => toggleUser(id)} className="hover:bg-[#bd882c]/20 rounded-full p-0.5">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <ScrollArea className="h-[240px] border-t border-border/30">
              <div className="p-1">
                {filteredUsers.map((user) => {
                  const selected = selectedIds.has(user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={() => toggleUser(user.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors",
                        selected && "bg-[#bd882c]/5"
                      )}
                    >
                      <div
                        className={cn(
                          "h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                          selected ? "bg-[#bd882c] border-[#bd882c] text-white" : "border-border/60"
                        )}
                      >
                        {selected && <Check className="h-3 w-3" />}
                      </div>
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={resolveImageUrl(user.image)} />
                        <AvatarFallback className="text-[9px]">{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <p className="text-[13px] font-medium truncate flex-1 text-left">{user.name}</p>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="px-4 pt-3 flex gap-2">
              <Button variant="outline" onClick={() => setStep("info")} className="flex-1 h-9">
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={selectedIds.size === 0 || createGroup.isPending}
                className="flex-1 bg-[#bd882c] hover:bg-[#bd882c]/90 text-white h-9"
              >
                {createGroup.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Creating...
                  </>
                ) : (
                  `Create with ${selectedIds.size} member${selectedIds.size !== 1 ? "s" : ""}`
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
