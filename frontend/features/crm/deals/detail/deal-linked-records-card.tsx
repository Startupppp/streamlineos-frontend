"use client";

import Link from "next/link";
import { Building2, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useParty } from "@/hooks/api/party/parties";
import { useSubject } from "@/hooks/api/party/subjects";

interface DealLinkedRecordsCardProps {
  partyId: string | null;
  subjectId: string | null;
}

interface LinkedRowProps {
  href: string;
  icon: typeof Building2;
  label: string;
  title: string;
  detail?: string | null;
  isLoading: boolean;
}

function LinkedRow({ href, icon: Icon, label, title, detail, isLoading }: LinkedRowProps) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium tracking-wider uppercase text-muted-foreground">
        {label}
      </p>
      {isLoading ? (
        <Skeleton className="mt-1.5 h-5 w-40" />
      ) : (
        <Link href={href} className="group mt-1 flex items-center gap-2 min-w-0">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 flex-1">
            <TruncatedText
              text={title}
              className="text-sm font-medium transition-colors group-hover:text-primary"
            />
            {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
          </span>
        </Link>
      )}
    </div>
  );
}

/**
 * What the deal is with, and what it is about.
 *
 * Both are resolved to their names rather than rendered as the ids the deal
 * stores, and the card is absent rather than empty when a deal has neither --
 * most deals in most tenants will have no subject at all.
 */
export function DealLinkedRecordsCard({ partyId, subjectId }: DealLinkedRecordsCardProps) {
  const { data: party, isLoading: partyLoading } = useParty(partyId);
  const { data: subject, isLoading: subjectLoading } = useSubject(subjectId);

  if (!partyId && !subjectId) return null;

  return (
    <Card className="shadow-noir">
      <CardHeader>
        <CardTitle className="text-base">Linked Records</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {partyId ? (
          <LinkedRow
            href={`/party/parties?partyId=${partyId}`}
            icon={Building2}
            label="Party"
            title={party?.displayName ?? party?.name ?? "Party"}
            detail={party?.email ?? party?.website ?? null}
            isLoading={partyLoading}
          />
        ) : null}

        {subjectId ? (
          <LinkedRow
            href={`/subjects?subjectId=${subjectId}`}
            icon={Package}
            label={subject?.typeSingular ?? "Subject"}
            title={subject?.title ?? "Subject"}
            detail={subject?.reference ?? null}
            isLoading={subjectLoading}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
