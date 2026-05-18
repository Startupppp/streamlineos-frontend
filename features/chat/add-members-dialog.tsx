"use client";

import { useMemo, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useAddChannelMembers,
  useChatOrgUsers,
} from "@/lib/hooks/trpc-hooks";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getInitials } from "./chat-helpers";

type OrgUserItem = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export function AddMembersDialog({
  open,
  onOpenChange,
  channelId,
  existingMemberIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: number;
  existingMemberIds: Set<string>;
}) {
  const { data: orgUsers, isLoading } = useChatOrgUsers(open);
  const addMembers = useAddChannelMembers();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const eligible = useMemo(() => {
    const users = (orgUsers ?? []) as OrgUserItem[];
    return users.filter((u) => !existingMemberIds.has(u.id));
  }, [orgUsers, existingMemberIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return eligible;
    return eligible.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  }, [eligible, search]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSelected(new Set());
    setSearch("");
  }, []);

  const handleClose = useCallback(
    (next: boolean) => {
      if (!next) reset();
      onOpenChange(next);
    },
    [onOpenChange, reset]
  );

  const handleSubmit = useCallback(async () => {
    if (selected.size === 0) return;
    try {
      const result = await addMembers.mutateAsync({
        channelId,
        userIds: Array.from(selected),
      });
      if (result.added > 0) {
        toast.success(
          `Added ${result.added} member${result.added === 1 ? "" : "s"}`
        );
      } else {
        toast.info("No new members added");
      }
      handleClose(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [addMembers, channelId, selected, handleClose]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add people</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email"
              className="pl-9 h-9 text-sm"
            />
          </div>

          <ScrollArea className="h-[280px] -mx-1">
            <div className="px-1 space-y-0.5">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-[12px] text-muted-foreground py-8">
                  {eligible.length === 0
                    ? "Everyone is already in this channel."
                    : "No people match your search."}
                </p>
              ) : (
                filtered.map((u) => {
                  const isSelected = selected.has(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggle(u.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-muted/40 transition-colors text-left",
                        isSelected && "bg-gold/5"
                      )}
                    >
                      <div
                        className={cn(
                          "h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                          isSelected
                            ? "bg-gold border-gold text-white"
                            : "border-border/60"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={resolveImageUrl(u.image)} />
                        <AvatarFallback className="text-[9px]">
                          {getInitials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate">
                          {u.name ?? u.email}
                        </p>
                        {u.email && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            {u.email}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-[11px] text-muted-foreground">
              {selected.size > 0
                ? `${selected.size} selected`
                : "Select one or more people"}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleClose(false)}
                className="h-8 text-[12px]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={selected.size === 0 || addMembers.isPending}
                className="h-8 text-[12px] bg-gold hover:bg-gold/90 text-white"
              >
                {addMembers.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  `Add ${selected.size > 0 ? selected.size : ""}`.trim()
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
