"use client";

import { useRef, useCallback, useState } from "react";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { PmPageShell, PmPanel, PmSection, PM_ROW } from "@/components/pm-chrome";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface StubMember {
  id: number;
  name: string;
  email: string;
  role: "member" | "lead";
  initials: string;
}

const STUB_MEMBERS: StubMember[] = [
  { id: 1, name: "Alice Chen", email: "alice@example.com", role: "lead", initials: "AC" },
  { id: 2, name: "Bob Smith", email: "bob@example.com", role: "member", initials: "BS" },
  { id: 3, name: "Carol Davis", email: "carol@example.com", role: "member", initials: "CD" },
];

function TeamMembersKeyboardCase() {
  const searchRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState<number | null>(null);

  const handleKeyboardOpen = useCallback((index: number) => {
    setFocused(index);
  }, []);

  const handleKeyboardClear = useCallback(() => {
    setFocused(null);
  }, []);

  useBuildListKeyboard({
    itemCount: STUB_MEMBERS.length,
    onOpen: handleKeyboardOpen,
    onClearSelection: handleKeyboardClear,
    searchInputRef: searchRef,
    enabled: true,
  });

  return (
    <section data-case-frame="team-members-keyboard" className="flex min-h-0 flex-col gap-3">
      {focused !== null ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Focused: {STUB_MEMBERS[focused]?.name ?? ""}
        </p>
      ) : null}
      <PmPanel role="list" aria-label="Team members">
        {STUB_MEMBERS.map((member) => (
          <div key={member.id} role="listitem" className={PM_ROW}>
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-xs">{member.initials}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{member.name}</span>
              <span className="text-xs text-muted-foreground">{member.email}</span>
            </div>
            <Badge variant="outline" className="shrink-0 px-1.5 py-0.5 text-xs capitalize">
              {member.role}
            </Badge>
          </div>
        ))}
      </PmPanel>
    </section>
  );
}

function TeamDetailLoadingCase() {
  return (
    <section data-case-frame="team-detail-loading" className="flex min-h-0 flex-col gap-3">
      <h2 className="text-sm font-medium">Loading — team detail</h2>
      <PmPanel className="space-y-3 p-4">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </PmPanel>
      <PmPanel className="space-y-2 p-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </PmPanel>
    </section>
  );
}

export function TeamHomeGallery() {
  return (
    <div className="flex flex-col gap-8 p-4">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">
          Team detail surfaces
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Keyboard reachability, screen-reader roles, and responsive layout for the team member list.
          j/k moves focus · Enter opens member · Esc clears.
        </p>
      </header>

      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          <TeamMembersKeyboardCase />
        </PmSection>
      </PmPageShell>

      <TeamDetailLoadingCase />
    </div>
  );
}
