"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FieldRowDraft } from "./arrangement-draft";

export interface FieldArrangementProps {
  rows: readonly FieldRowDraft[];
  onMove: (index: number, by: number) => void;
  onHiddenChange: (name: string, hidden: boolean) => void;
  onGroupChange: (name: string, group: string) => void;
  disabled?: boolean;
}

/**
 * One line per field: where it sits, whether it is shown, what it sits under.
 *
 * Field-level and nothing more. A visual builder is out of scope, and the reason
 * is not effort — a canvas invites a tenant to design a screen, which is a job
 * they did not ask for and cannot finish, whereas moving a column up is a job
 * they already know they want done.
 *
 * The switch reads "Shown" rather than "Hidden" because a control that is on
 * when nothing happens is the one people can read at a glance. A field that
 * cannot be hidden shows no switch at all and says why — a disabled control with
 * no explanation is a dead end.
 */
export function FieldArrangement({
  rows,
  onMove,
  onHiddenChange,
  onGroupChange,
  disabled = false,
}: FieldArrangementProps) {
  return (
    <ul className="flex min-w-0 flex-col divide-y divide-border rounded-xl border border-border bg-card">
      {rows.map((row, index) => (
        <li
          key={row.name}
          className={cn(
            "flex min-w-0 flex-wrap items-center gap-gap-field px-card-pad py-2",
            row.hidden && "opacity-60",
          )}
        >
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={disabled || index === 0}
              aria-label={`Move ${row.label} up`}
              onClick={() => onMove(index, -1)}
            >
              <ArrowUp className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={disabled || index === rows.length - 1}
              aria-label={`Move ${row.label} down`}
              onClick={() => onMove(index, 1)}
            >
              <ArrowDown className="size-3.5" />
            </Button>
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{row.label}</span>
            <span className="truncate text-micro text-muted-foreground">{row.name}</span>
          </div>

          <Input
            className="w-40 shrink-0"
            value={row.group}
            disabled={disabled}
            placeholder="No section"
            aria-label={`Section for ${row.label}`}
            onChange={(event) => onGroupChange(row.name, event.target.value)}
          />

          {row.hidable ? (
            <div className="flex shrink-0 items-center gap-gap-inline">
              <Switch
                id={`shown-${row.name}`}
                checked={!row.hidden}
                disabled={disabled}
                onCheckedChange={(shown) => onHiddenChange(row.name, !shown)}
              />
              <Label htmlFor={`shown-${row.name}`} className="text-dense text-muted-foreground">
                Shown
              </Label>
            </div>
          ) : (
            <span className="shrink-0 text-dense text-muted-foreground">
              Always shown
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
