"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  ExternalLink,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2 } from "lucide-react";

interface PageBuilderToolbarProps {
  isEditing: boolean;
  isPublished: boolean;
  showPreview: boolean;
  isPending: boolean;
  publicUrl: string | null;
  slug: string;
  onTogglePreview: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onTogglePublish: (checked: boolean) => void;
}

export function PageBuilderToolbar({
  isEditing,
  isPublished,
  showPreview,
  isPending,
  publicUrl,
  slug,
  onTogglePreview,
  onSaveDraft,
  onPublish,
  onTogglePublish,
}: PageBuilderToolbarProps) {
  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/marketing/landing-pages">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Link>
        </Button>

        {isEditing && publicUrl && (
          <Button variant="ghost" size="sm" asChild>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-4 w-4" />
              View Live
            </a>
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={onTogglePreview}>
          {showPreview ? (
            <EyeOff className="mr-1.5 h-4 w-4" />
          ) : (
            <Eye className="mr-1.5 h-4 w-4" />
          )}
          {showPreview ? "Hide Preview" : "Preview"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onSaveDraft}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Clock className="mr-1.5 h-4 w-4" />
          )}
          Save Draft
        </Button>

        <Button size="sm" onClick={onPublish} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Globe className="mr-1.5 h-4 w-4" />
          )}
          {isPublished ? "Update & Publish" : "Publish"}
        </Button>
      </div>

      {isEditing && (
        <div className="flex items-center gap-3 rounded-lg border px-4 py-2.5 mb-4 bg-card">
          <div className="flex items-center gap-2 flex-1">
            {isPublished ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                  Published
                </span>
                {publicUrl && (
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground ml-2 underline-offset-2 hover:underline"
                  >
                    {publicUrl}
                  </a>
                )}
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Draft — not visible publicly
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {isPublished ? "Unpublish" : "Publish"}
            </span>
            <Switch
              checked={isPublished}
              onCheckedChange={onTogglePublish}
              disabled={isPending}
            />
          </div>
        </div>
      )}
    </>
  );
}
