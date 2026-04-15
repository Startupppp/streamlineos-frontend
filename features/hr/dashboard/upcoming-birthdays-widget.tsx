"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Cake } from "lucide-react";

function getInitials(name: string | null, firstName: string | null, lastName: string | null) {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (name) return name.slice(0, 2).toUpperCase();
  return "?";
}

interface BirthdayEntry {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  dateOfBirth: string;
  daysUntil: number;
}

interface Props {
  birthdays: BirthdayEntry[];
  isLoading: boolean;
}

export function UpcomingBirthdaysWidget({ birthdays, isLoading }: Props) {
  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center gap-2">
        <Cake className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-sm font-medium">Upcoming Birthdays</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        ) : birthdays.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No birthdays in the next 7 days
          </p>
        ) : (
          <div className="space-y-2">
            {birthdays.map((b) => {
              const displayName =
                b.firstName && b.lastName
                  ? `${b.firstName} ${b.lastName}`
                  : b.name ?? "Unknown";
              return (
                <div key={b.id} className="flex items-center gap-2 py-0.5">
                  <Avatar className="h-7 w-7 shrink-0">
                    {b.image && <AvatarImage src={b.image} alt={displayName} />}
                    <AvatarFallback className="text-[10px]">
                      {getInitials(b.name, b.firstName, b.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{displayName}</p>
                  </div>
                  <Badge
                    variant={b.daysUntil === 0 ? "default" : "secondary"}
                    className="text-[10px] shrink-0"
                  >
                    {b.daysUntil === 0 ? "Today!" : `in ${b.daysUntil}d`}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
