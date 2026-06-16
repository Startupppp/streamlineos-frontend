"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { MapPin, Phone, Mail, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Branch } from "@/types/organization";

interface BranchListProps {
  branches: Branch[];
  isLoading: boolean;
  onEdit: (branch: Branch) => void;
  onDelete: (branch: Branch) => void;
  onCreate: () => void;
}

export function BranchList({
  branches,
  isLoading,
  onEdit,
  onDelete,
  onCreate,
}: BranchListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <div className="flex flex-1 min-h-[60vh]">
        <EmptyState
          illustration={<EmptyTeamIllustration className="h-32 w-32" />}
          title="No branches yet"
          description="Create a branch to set up your multi-branch hierarchy."
          action={{ label: "Add Branch", onClick: onCreate }}
          className="w-full"
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-stretch">
      {branches.map((branch) => (
        <Card
          key={branch.id}
          className="hover:border-blue-500/30 transition-colors h-full"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">{branch.name}</CardTitle>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {branch.code}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    branch.status === "ACTIVE"
                      ? "text-emerald-400 bg-emerald-500/10"
                      : "text-muted-foreground",
                  )}
                >
                  {branch.status}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onEdit(branch)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => onDelete(branch)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            {(branch.city || branch.state) && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3 w-3" />
                {[branch.city, branch.state, branch.country]
                  .filter(Boolean)
                  .join(",")}
                {branch.pincode && (
                  <span className="font-mono">— {branch.pincode}</span>
                )}
              </p>
            )}
            {branch.address && (
              <p className="text-xs text-muted-foreground">{branch.address}</p>
            )}
            {branch.phone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> {branch.phone}
              </p>
            )}
            {branch.email && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3 w-3" /> {branch.email}
              </p>
            )}

            <div className="pt-2 border-t space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Branch Manager
                </span>
                {branch.branchManager ? (
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[8px]">
                        {branch.branchManager.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{branch.branchManager.name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Not assigned
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Branch HR</span>
                {branch.branchHr ? (
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[8px]">
                        {branch.branchHr.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{branch.branchHr.name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Not assigned
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
