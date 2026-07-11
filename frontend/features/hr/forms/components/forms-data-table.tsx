"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Play, Archive } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useActivateHrForm, useArchiveHrForm, useDeleteHrForm } from "../hooks/use-hr-forms";
import type { HrForm } from "../lib/types";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-50 text-slate-600 border-slate-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-red-50 text-red-600 border-red-200",
};

interface FormsDataTableProps {
  forms: HrForm[];
}

export function FormsDataTable({ forms }: FormsDataTableProps) {
  const activate = useActivateHrForm();
  const archive = useArchiveHrForm();
  const del = useDeleteHrForm();

  async function handleActivate(id: number) {
    try {
      await activate.mutateAsync(id);
      toast.success("Form activated");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleArchive(id: number) {
    try {
      await archive.mutateAsync(id);
      toast.success("Form archived");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleDelete(id: number) {
    try {
      await del.mutateAsync(id);
      toast.success("Form deleted");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (forms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-muted-foreground">No forms yet. Create your first form to get started.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Audience</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Fields</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Workflow</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {forms.map((form) => (
            <tr key={form.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3">
                <Link
                  href={`/hr/settings/forms/${form.id}`}
                  className="font-medium text-foreground hover:text-blue-600 transition-colors"
                >
                  {form.name}
                </Link>
                {form.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{form.description}</p>
                )}
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline" className={`text-[11px] ${STATUS_COLORS[form.status] ?? ""}`}>
                  {form.status}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline" className="text-[11px]">
                  {form.audience}
                </Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{form.schema.length}</td>
              <td className="px-4 py-3">
                {form.workflowObjectType ? (
                  <Badge variant="secondary" className="text-[11px]">
                    {form.workflowObjectType.replace(/_/g, " ")}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/hr/settings/forms/${form.id}`}>
                        <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                      </Link>
                    </DropdownMenuItem>
                    {form.status === "draft" && (
                      <DropdownMenuItem onClick={() => handleActivate(form.id)}>
                        <Play className="h-3.5 w-3.5 mr-2" /> Activate
                      </DropdownMenuItem>
                    )}
                    {form.status === "active" && (
                      <DropdownMenuItem onClick={() => handleArchive(form.id)}>
                        <Archive className="h-3.5 w-3.5 mr-2" /> Archive
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href={`/hr/settings/forms/${form.id}/submissions`}>
                        Submissions
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(form.id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
