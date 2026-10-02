"use client";

import { useState, type ReactNode } from "react";
import { AppSheet } from "@/components/shared/app-sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { PersonDrawerHeader } from "./person-drawer-header";
import {
  PERSON_DRAWER_SECTIONS,
  type PersonDrawerException,
  type PersonDrawerSectionKey,
  type PersonSummary,
} from "./person-summary";

export interface PersonDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: PersonSummary | null;
  profileHref?: string;
  exceptions?: PersonDrawerException[];
  canSeePay?: boolean;
  sections: Partial<Record<PersonDrawerSectionKey, ReactNode>>;
  hiddenSections?: PersonDrawerSectionKey[];
}

export function PersonDrawer({
  open,
  onOpenChange,
  person,
  profileHref,
  exceptions,
  canSeePay = false,
  sections,
  hiddenSections = [],
}: PersonDrawerProps) {
  const [section, setSection] = useState<string>("overview");

  if (!person) return null;

  const visible = PERSON_DRAWER_SECTIONS.filter(
    (candidate) =>
      !hiddenSections.includes(candidate.key) &&
      (candidate.key === "pay" || sections[candidate.key] !== undefined),
  );
  const active = visible.some((candidate) => candidate.key === section)
    ? section
    : (visible[0]?.key ?? "overview");

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Person"
      description="Identity, employment, time, pay and documents for one person."
      className="sm:max-w-xl"
    >
      <div className="flex min-h-0 flex-col gap-4">
        <PersonDrawerHeader
          person={person}
          profileHref={profileHref}
          exceptions={exceptions}
        />

        {visible.length > 0 ? (
          <Tabs value={active} onValueChange={setSection} className="flex min-h-0 flex-col gap-3">
            <TabsList className="w-full justify-start overflow-x-auto">
              {visible.map((candidate) => (
                <TabsTrigger key={candidate.key} value={candidate.key}>
                  {candidate.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {visible.map((candidate) => (
              <TabsContent key={candidate.key} value={candidate.key} className="min-h-0">
                {candidate.key === "pay" && !canSeePay ? (
                  <NoPermissionState
                    compact
                    permission="payroll:salaries:view"
                    title="Pay details restricted"
                    description="Your role does not include this person's pay."
                  />
                ) : (
                  sections[candidate.key]
                )}
              </TabsContent>
            ))}
          </Tabs>
        ) : null}
      </div>
    </AppSheet>
  );
}
