"use client";

import { memo } from "react";
import { Clock, LogOut, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { resolveImageUrl } from "@/lib/utils";
import { getInitials, formatTime } from "@/lib/format-utils";
import { getColorSafe, onlineStatusColors } from "@/lib/theme-constants";

interface TeamMember {
  userId: string;
  name: string;
  image: string | null;
  isOnline: boolean | null;
  checkIn: string | Date | null;
  checkOut: string | Date | null;
}

interface TeamCardProps {
  members: TeamMember[] | undefined;
  isLoading: boolean;
}

export const TeamCard = memo(function TeamCard({ members, isLoading }: TeamCardProps) {
  return (
    <Card className="bg-card border-border shadow-noir flex flex-col max-h-[360px] md:max-h-[420px]">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-gold" aria-hidden="true" />
          Team Availability
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col" aria-live="polite">
        {isLoading ? (
          <div className="space-y-3 overflow-y-auto">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : members && members.length > 0 ? (
          <div className="space-y-3 overflow-y-auto pr-2 max-h-full">
            {members.map((member) => (
              <div key={member.userId} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={resolveImageUrl(member.image)} />
                      <AvatarFallback className="text-xs">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${getColorSafe(onlineStatusColors, member.isOnline ? "online" : "offline")}`} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{member.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {member.isOnline ? (
                        <>
                          <Clock className="h-3 w-3" />
                          Checked in at {formatTime(member.checkIn)}
                        </>
                      ) : member.checkOut ? (
                        <>
                          <LogOut className="h-3 w-3" />
                          Checked out at {formatTime(member.checkOut)}
                        </>
                      ) : (
                        "Offline"
                      )}
                    </p>
                  </div>
                </div>
                <Badge variant={member.isOnline ? "default" : "secondary"} className={member.isOnline ? getColorSafe(onlineStatusColors, "online") : ""}>
                  {member.isOnline ? "Online" : "Offline"}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              illustration={<EmptyTeamIllustration />}
              title="No team members online"
              description="Team availability will appear here when members clock in."
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
});
