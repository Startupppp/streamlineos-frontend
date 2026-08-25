"use client";

import { memo, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Heart, Award, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { HrSheet } from "@/features/hr/hr-sheet";
import { MemberPicker } from "@/components/shared";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLeaderboard, useEngagementBadges, useAwardBadge } from "@/hooks/api/hr/engagement";
import { useOrgMembers } from "@/hooks/api/organization";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  getUserDisplayName,
  getUserInitials,
  type NamedUser,
} from "@/lib/person-display";

interface Recognition {
  id: number;
  fromUserId: string;
  toUserId: string;
  message: string;
  category: string;
  createdAt: string;
  fromUser?: { name?: string; email: string };
  toUser?: { name?: string; email: string };
}

interface RecognitionFeedProps {
  recognitions: Recognition[];
  isLoading: boolean;
  onGiveKudos: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  KUDOS: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  TEAMWORK: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  INNOVATION: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  LEADERSHIP: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  ABOVE_AND_BEYOND: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30",
};

function displayName(user?: { name?: string; email: string } | null): string {
  return user?.name ?? user?.email ?? "Unknown";
}

function useMemberLookup() {
  const { data: membersData } = useOrgMembers(1, 200);

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, { name: member.name, email: member.email });
    }
    return map;
  }, [membersData]);

  const resolveMemberName = useCallback(
    (userId: string) => {
      const member = memberById.get(userId);
      return member ? getUserDisplayName(member) : "Unknown";
    },
    [memberById],
  );

  const resolveMemberInitials = useCallback(
    (userId: string) => {
      const member = memberById.get(userId);
      return member ? getUserInitials(member) : userId.slice(0, 2).toUpperCase();
    },
    [memberById],
  );

  return { resolveMemberName, resolveMemberInitials };
}

const RecognitionCard = memo(function RecognitionCard({
  recognition: r,
}: {
  recognition: Recognition;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
          {displayName(r.fromUser).slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
            <span className="text-xs font-semibold text-foreground">{displayName(r.fromUser)}</span>
            <span className="text-xs text-muted-foreground">recognized</span>
            <span className="text-xs font-semibold text-foreground">{displayName(r.toUser)}</span>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-micro font-medium border ${
                CATEGORY_COLORS[r.category] ?? CATEGORY_COLORS.KUDOS
              }`}
            >
              {r.category.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{r.message}</p>
        </div>
      </div>
    </div>
  );
});

const LeaderboardRow = memo(function LeaderboardRow({
  rank,
  total,
  displayLabel,
  initials,
}: {
  rank: number;
  total: number;
  displayLabel: string;
  initials: string;
}) {
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors">
      <span className="text-sm w-6 text-center shrink-0">
        {rank < 3 ? medals[rank] : `${rank + 1}`}
      </span>
      <div className="w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-micro font-bold shrink-0">
        {initials}
      </div>
      <span className="text-xs font-medium text-foreground flex-1 min-w-0 truncate">
        {displayLabel}
      </span>
      <span className="text-xs font-semibold text-primary tabular-nums shrink-0">
        {total} pts
      </span>
    </div>
  );
});

export function RecognitionFeed({ recognitions, isLoading, onGiveKudos }: RecognitionFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (recognitions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 rounded-lg border border-dashed border-border bg-muted/20">
        <Heart className="w-8 text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-foreground">No kudos yet</p>
        <p className="text-xs text-muted-foreground mt-1">Be the first to recognize a colleague!</p>
        <Button size="sm" className="mt-4 h-8 gap-1.5" onClick={onGiveKudos}>
          <Heart className="h-3.5 w-3.5" />
          Give Kudos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recognitions.map((r) => (
        <RecognitionCard key={r.id} recognition={r} />
      ))}
    </div>
  );
}

export function BadgesGrid() {
  const { data: badges, isLoading } = useEngagementBadges();
  const canManage = useCan("hr:engagement:manage");
  const award = useAwardBadge();
  const [awardBadgeId, setAwardBadgeId] = useState<number | null>(null);
  const [recipientId, setRecipientId] = useState("");
  const [reason, setReason] = useState("");

  const handleAward = useCallback(() => {
    if (!awardBadgeId || !recipientId.trim()) return;
    toast.promise(award.mutateAsync({ badgeId: awardBadgeId, userId: recipientId, reason }), {
      loading: "Awarding badge...",
      success: () => {
        setAwardBadgeId(null);
        setRecipientId("");
        setReason("");
        return "Badge awarded!";
      },
      error: getErrorMessage,
    });
  }, [awardBadgeId, recipientId, reason, award]);

  const handleRecipientChange = useCallback((id: string | null) => {
    setRecipientId(id ?? "");
  }, []);

  const handleReasonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReason(e.target.value);
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!badges || badges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 rounded-lg border border-dashed border-border bg-muted/20">
        <Award className="w-7 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No badges created yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className="bg-card border border-border rounded-lg p-3 flex flex-col items-center gap-1.5 text-center"
          >
            <span className="text-2xl">{badge.icon}</span>
            <p className="text-xs font-semibold text-foreground leading-tight">{badge.name}</p>
            <TruncatedText text={badge.description} lines={2} className="text-micro text-muted-foreground leading-tight" />
            <Badge variant="secondary" className="text-micro px-1.5 h-4">
              {badge.points} pts
            </Badge>
            {canManage && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-micro px-2 mt-1"
                onClick={() => setAwardBadgeId(badge.id)}
              >
                Award
              </Button>
            )}
          </div>
        ))}
      </div>

      <HrSheet
        open={awardBadgeId !== null}
        onOpenChange={(open) => { if (!open) setAwardBadgeId(null); }}
        title="Award Badge"
        description="Recognize an employee with this badge."
        onSubmit={handleAward}
        submitLabel="Award Badge"
        isPending={award.isPending}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Employee</Label>
            <MemberPicker
              mode="single"
              value={recipientId || undefined}
              onChange={handleRecipientChange}
              placeholder="Select employee"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="award-reason" className="text-xs font-medium">Reason (optional)</Label>
            <Textarea
              id="award-reason"
              placeholder="Why are you awarding this badge?"
              value={reason}
              onChange={handleReasonChange}
              className="min-h-[80px] text-sm resize-none"
            />
          </div>
        </div>
      </HrSheet>
    </>
  );
}

export function PointsLeaderboard() {
  const { data: entries, isLoading } = useLeaderboard(20);
  const { resolveMemberName, resolveMemberInitials } = useMemberLookup();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Trophy className="w-7 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No points earned yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((entry, idx) => (
        <LeaderboardRow
          key={entry.userId}
          rank={idx}
          total={entry.total}
          displayLabel={resolveMemberName(entry.userId)}
          initials={resolveMemberInitials(entry.userId)}
        />
      ))}
    </div>
  );
}

export function GiveKudosSheet({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { toUserId: string; message: string; category: string }) => void;
  isPending: boolean;
}) {
  const [toUserId, setToUserId] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("KUDOS");

  const handleSubmit = useCallback(() => {
    if (!toUserId.trim() || !message.trim()) return;
    onSubmit({ toUserId, message, category });
  }, [toUserId, message, category, onSubmit]);

  const handleToUserIdChange = useCallback((id: string | null) => {
    setToUserId(id ?? "");
  }, []);

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  }, []);

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Give Kudos"
      description="Recognize a colleague for their great work."
      onSubmit={handleSubmit}
      submitLabel="Send Kudos"
      isPending={isPending}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Recipient</Label>
          <MemberPicker
            mode="single"
            value={toUserId || undefined}
            onChange={handleToUserIdChange}
            placeholder="Select colleague"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="KUDOS">Kudos</SelectItem>
              <SelectItem value="TEAMWORK">Teamwork</SelectItem>
              <SelectItem value="INNOVATION">Innovation</SelectItem>
              <SelectItem value="LEADERSHIP">Leadership</SelectItem>
              <SelectItem value="ABOVE_AND_BEYOND">Above & Beyond</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kudos-message" className="text-xs font-medium">Message</Label>
          <Textarea
            id="kudos-message"
            placeholder="Tell them why they rock..."
            value={message}
            onChange={handleMessageChange}
            className="min-h-[100px] text-sm resize-none"
          />
        </div>
      </div>
    </HrSheet>
  );
}
