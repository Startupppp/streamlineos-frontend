import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { KbTriangleAlertIcon, KbUploadIcon, KbXIcon } from "@/features/wiki/lib/kb-icons";

export interface ImportPendingItem {
  title: string;
  contentText: string;
  sizeBytes: number;
}

interface ImportPendingListProps {
  items: ImportPendingItem[];
  isImporting: boolean;
  onClearAll: () => void;
  onImport: () => void;
  onRemove: (index: number) => void;
  titleExists: (title: string) => boolean;
}

function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ImportPendingRow({
  item,
  index,
  isDuplicate,
  onRemove,
}: {
  item: ImportPendingItem;
  index: number;
  isDuplicate: boolean;
  onRemove: (index: number) => void;
}) {
  function handleRemove() {
    onRemove(index);
  }

  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 px-3 py-2 text-sm">
      <TruncatedText text={item.title || "Untitled"} className="font-medium" />
      <span className="text-xs text-muted-foreground">{sizeLabel(item.sizeBytes)}</span>
      <span className="w-20">
        {isDuplicate ? (
          <span className="flex items-center gap-1 text-xs text-status-warning-ink">
            <KbTriangleAlertIcon className="h-3 w-3" />
            Duplicate
          </span>
        ) : null}
      </span>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleRemove}
        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
        aria-label="Remove"
      >
        <KbXIcon className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function ImportPendingList({
  items,
  isImporting,
  onClearAll,
  onImport,
  onRemove,
  titleExists,
}: ImportPendingListProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          {items.length} page{items.length === 1 ? "" : "s"} to import
        </p>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClearAll}
          className="h-6 text-xs text-muted-foreground hover:text-foreground"
        >
          Clear all
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 bg-muted/30 px-3 py-1.5 text-dense font-medium text-muted-foreground">
          <span>Title</span>
          <span>Size</span>
          <span>Status</span>
          <span />
        </div>
        <div className="divide-y divide-border">
          {items.map((item, index) => (
            <ImportPendingRow
              key={`${item.title}-${index}`}
              item={item}
              index={index}
              isDuplicate={titleExists(item.title)}
              onRemove={onRemove}
            />
          ))}
        </div>
      </div>

      <LoadingButton
        size="sm"
        onClick={onImport}
        isPending={isImporting}
        loadingText="Importing…"
        className="gap-1.5"
      >
        <KbUploadIcon className="h-3.5 w-3.5" />
        Import {items.length} page{items.length === 1 ? "" : "s"}
      </LoadingButton>
    </div>
  );
}
