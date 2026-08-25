import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import type { OrganizationPerson } from "@/types/directory/people";
import {
  getPersonAccessBadge,
  getPersonAccessBadgeTone,
} from "./person-account-access";
import {
  formatPersonDate,
  getPersonDisplayName,
  getPersonInitials,
} from "./person-detail-formatters";

export function PersonDetailSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden rounded-lg border border-border bg-card">
      <div className="shrink-0 overflow-x-auto border-b border-border bg-muted/20 p-2">
        <div className="flex gap-1">
          {Array.from({ length: 4 }).map((_, skeletonIndex) => (
            <Skeleton
              key={skeletonIndex}
              className="h-8 w-20 rounded-md"
            />
          ))}
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, skeletonIndex) => (
            <div key={skeletonIndex} className="space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileFields({ person }: { person: OrganizationPerson }) {
  const profileFields: { label: string; value: string | null }[] = [
    { label: "Work email", value: person.workEmail },
    { label: "Personal email", value: person.personalEmail },
    { label: "Phone", value: person.phone },
    { label: "WhatsApp", value: person.whatsappNumber },
    { label: "Timezone", value: person.timezone },
    { label: "Preferred name", value: person.preferredName },
  ];

  return (
    <div className="space-y-3">
      {profileFields.map(({ label, value }) =>
        value ? (
          <div
            key={label}
            className="flex flex-col gap-0.5 border-b border-border/60 py-2 last:border-0"
          >
            <span className="text-dense uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
            <span className={cn("text-sm text-foreground", TEXT_ONE_LINE)}>
              {value}
            </span>
          </div>
        ) : null,
      )}
      {person.bio ? (
        <div className="pt-2">
          <span className="text-dense uppercase tracking-wide text-muted-foreground">
            Bio
          </span>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {person.bio}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function PersonProfileTab({
  person,
}: {
  person: OrganizationPerson;
}) {
  const displayName = getPersonDisplayName(person);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-start gap-3">
        <Avatar className="h-14 w-14 shrink-0">
          <AvatarImage src={person.avatarUrl ?? undefined} alt={displayName} />
          <AvatarFallback className="text-sm font-semibold">
            {getPersonInitials(person)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{displayName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Added {formatPersonDate(person.createdAt)}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <SemanticBadge
              tone={getPersonAccessBadgeTone(person)}
              label={getPersonAccessBadge(person)}
              size="xs"
            />
          </div>
        </div>
      </div>
      <Separator className="my-5 shrink-0" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ProfileFields person={person} />
      </div>
    </div>
  );
}
