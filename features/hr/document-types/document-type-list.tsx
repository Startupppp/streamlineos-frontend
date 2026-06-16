"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyUploadIllustration } from "@/components/illustrations";
import { Pencil, PowerOff, Power } from "lucide-react";

interface DocumentType {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isMandatory: boolean | null;
  isActive: boolean | null;
  sortOrder: number | null;
  applicableRoles: string[] | null;
  createdAt: string | null;
}

interface DocumentTypeListProps {
  items: DocumentType[];
  isHROrCEO: boolean;
  onEdit: (dt: DocumentType) => void;
  onDeactivate: (dt: DocumentType) => void;
  onReactivate: (dt: DocumentType) => void;
  onCreateClick: () => void;
}

export function DocumentTypeList({
  items,
  isHROrCEO,
  onEdit,
  onDeactivate,
  onReactivate,
  onCreateClick,
}: DocumentTypeListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        illustration={<EmptyUploadIllustration className="h-40 w-40" />}
        title="No document types configured"
        description="Add document types to define what employees must submit during onboarding."
        action={
          isHROrCEO
            ? { label: "Add Document Type", onClick: onCreateClick }
            : undefined
        }
      />
    );
  }

  return (
    <ScrollArea className="w-full" type="auto">
      <div className="min-w-[640px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Mandatory</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Sort Order</TableHead>
              <TableHead>Applicable Roles</TableHead>
              {isHROrCEO && (
                <TableHead className="text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((dt) => (
              <TableRow key={dt.id}>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium">{dt.name}</p>
                    {dt.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                        {dt.description}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {dt.isMandatory ? (
                    <Badge variant="default" className="text-[10px]">
                      Required
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      Optional
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {dt.isActive !== false ? (
                    <Badge
                      variant="default"
                      className="text-[10px] bg-green-600"
                    >
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      Inactive
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-center text-sm">
                  {dt.sortOrder ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(dt.applicableRoles ?? []).length === 0 ? (
                      <span className="text-xs text-muted-foreground">All</span>
                    ) : (
                      (dt.applicableRoles ?? []).map((r) => (
                        <Badge
                          key={r}
                          variant="outline"
                          className="text-[9px] py-0 h-4"
                        >
                          {r}
                        </Badge>
                      ))
                    )}
                  </div>
                </TableCell>
                {isHROrCEO && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => onEdit(dt)}
                        aria-label={`Edit ${dt.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {dt.isActive !== false ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => onDeactivate(dt)}
                          aria-label={`Deactivate ${dt.name}`}
                        >
                          <PowerOff className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-green-600"
                          onClick={() => onReactivate(dt)}
                          aria-label={`Reactivate ${dt.name}`}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );
}
