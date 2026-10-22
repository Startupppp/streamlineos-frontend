"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";
import { pageHref } from "@/lib/knowledge-routes";
import { getErrorMessage } from "@/lib/get-error-message";
import { useKbShortcuts, useDeleteKbShortcut } from "@/hooks/api/kb/shortcuts";
import type { KbShortcutItem } from "@/hooks/api/kb/shortcuts";
import { KbFileIcon, KbTrash2Icon } from "@/features/wiki/lib/kb-icons";

function ShortcutRow({ item }: { item: KbShortcutItem }) {
  const deleteShortcut = useDeleteKbShortcut();
  const isAvailable = item.state === "available";
  const href = isAvailable ? pageHref(item.targetPageId) : undefined;
  const label = item.target?.title ?? "Unavailable page";

  function handleRemove() {
    deleteShortcut.mutate(item.id, {
      onSuccess: () => toast.success("Shortcut removed"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  return (
    <li className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
      <KbFileIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      {isAvailable && href !== undefined ? (
        <Link href={href} className="min-w-0 flex-1 text-sm text-foreground">
          <TruncatedText text={label} />
        </Link>
      ) : (
        <span className="min-w-0 flex-1 text-sm text-muted-foreground line-through">
          <TruncatedText text={label} />
        </span>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
        aria-label="Remove shortcut"
        disabled={deleteShortcut.isPending}
        onClick={handleRemove}
      >
        <KbTrash2Icon className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}

export function ShortcutsSection() {
  const { data: shortcuts = [], isLoading, isError } = useKbShortcuts();

  if (isLoading) {
    return (
      <section className="space-y-1 px-1">
        <h3 className="text-sm font-medium text-foreground">Shortcuts</h3>
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </section>
    );
  }

  if (isError) {
    return (
      <section className="space-y-1 px-1">
        <h3 className="text-sm font-medium text-foreground">Shortcuts</h3>
        <p className="text-xs text-destructive">Could not load shortcuts.</p>
      </section>
    );
  }

  if (shortcuts.length === 0) return null;

  return (
    <section className="space-y-1">
      <h3 className="px-2 text-sm font-medium text-foreground">Shortcuts</h3>
      <ul className="flex flex-col">
        {shortcuts.map((item) => (
          <ShortcutRow key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}
