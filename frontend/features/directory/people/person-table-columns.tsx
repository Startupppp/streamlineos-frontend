"use client";

import { useCallback, type MouseEvent } from "react";
import Link from "next/link";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import type { DataTableColumn } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import type { OrganizationPerson } from "@/types/directory/people";
import {
  getPersonAccessBadge,
  getPersonAccessBadgeTone,
} from "./person-account-access";

export function personDisplayName(person: OrganizationPerson): string {
  if (person.displayName) return person.displayName;
  return `${person.firstName} ${person.lastName}`.trim();
}

function formatAddedDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

interface PersonNameCellProps {
  person: OrganizationPerson;
  href: string;
  onPeek: (person: OrganizationPerson) => void;
}

function PersonNameCell({ person, href, onPeek }: PersonNameCellProps) {
  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      onPeek(person);
    },
    [onPeek, person],
  );

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        "font-medium text-foreground hover:text-primary transition-colors",
        TEXT_ONE_LINE,
      )}
      title={personDisplayName(person)}
    >
      {personDisplayName(person)}
    </Link>
  );
}

interface PersonRowActionsProps {
  person: OrganizationPerson;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (person: OrganizationPerson) => void;
  onDelete: (person: OrganizationPerson) => void;
}

export function PersonRowActions({
  person,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: PersonRowActionsProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const handleEdit = useCallback(() => onEdit(person), [person, onEdit]);
  const handleDelete = useCallback(() => onDelete(person), [person, onDelete]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-7"
          aria-label={`Actions for ${personDisplayName(person)}`}
          {...hoverHandlers}
        >
          <EllipsisIcon ref={iconRef} size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canEdit && <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>}
        {canDelete && (
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            Remove from directory
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface PersonColumnsOptions {
  basePath: string;
  canUpdate: boolean;
  canDelete: boolean;
  onPeek: (person: OrganizationPerson) => void;
  onEdit: (person: OrganizationPerson) => void;
  onDelete: (person: OrganizationPerson) => void;
}

export function buildPersonColumns({
  basePath,
  canUpdate,
  canDelete,
  onPeek,
  onEdit,
  onDelete,
}: PersonColumnsOptions): DataTableColumn<OrganizationPerson>[] {
  return [
    {
      key: "name",
      header: "Name",
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <PersonNameCell
          person={row}
          href={`${basePath}/${row.organizationPersonId}`}
          onPeek={onPeek}
        />
      ),
    },
    {
      key: "workEmail",
      header: "Work email",
      className: "min-w-[160px]",
      cell: (row) => (
        <span className={cn("text-sm text-muted-foreground", TEXT_ONE_LINE)}>
          {row.workEmail ?? "—"}
        </span>
      ),
    },
    {
      key: "access",
      header: "App access",
      className: "min-w-[9rem]",
      cell: (row) => (
        <SemanticBadge
          tone={getPersonAccessBadgeTone(row)}
          label={getPersonAccessBadge(row)}
          size="xs"
        />
      ),
    },
    {
      key: "phone",
      header: "Phone",
      className: "min-w-[120px]",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{row.phone ?? "—"}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Added",
      className: "w-32 shrink-0",
      cell: (row) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatAddedDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (row) =>
        canUpdate || canDelete ? (
          <PersonRowActions
            person={row}
            canEdit={canUpdate}
            canDelete={canDelete}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : null,
    },
  ];
}
