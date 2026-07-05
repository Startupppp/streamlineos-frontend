'use client';

import React from 'react';
import { FileIcon } from 'lucide-react';
import { PlateElement } from 'platejs/react';
import type { PlateElementProps } from 'platejs/react';
import { Caption, CaptionTextarea, useCaptionState } from '@platejs/caption/react';
import { Skeleton } from '@/components/ui/skeleton';

function humanSize(bytes: unknown): string {
  const n = typeof bytes === 'number' ? bytes : 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function VideoElement({ element, children, ...props }: PlateElementProps) {
  const url = element['url'] as string | undefined;
  const captionState = useCaptionState();

  return (
    <PlateElement {...props} element={element} as="figure" className="my-3 w-full">
      <div contentEditable={false}>
        {url ? (
          <video
            controls
            src={url}
            className="max-w-full rounded-lg border border-border"
          />
        ) : (
          <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground">
            No video URL
          </div>
        )}
      </div>
      <Caption options={{ readOnly: captionState.readOnly }}>
        <CaptionTextarea placeholder="Add a caption..." />
      </Caption>
      {children}
    </PlateElement>
  );
}

export function AudioElement({ element, children, ...props }: PlateElementProps) {
  const url = element['url'] as string | undefined;

  return (
    <PlateElement {...props} element={element} className="my-3 w-full">
      <div contentEditable={false}>
        {url ? (
          <audio controls src={url} className="w-full" />
        ) : (
          <div className="flex h-10 items-center justify-center rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground">
            No audio URL
          </div>
        )}
      </div>
      {children}
    </PlateElement>
  );
}

export function FileElement({ element, children, ...props }: PlateElementProps) {
  const url = element['url'] as string | undefined;
  const name = element['name'] as string | undefined;
  const size = element['size'];

  function handleOpen() {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') handleOpen();
  }

  return (
    <PlateElement {...props} element={element} className="my-2">
      <div
        contentEditable={false}
        className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-muted"
        onClick={handleOpen}
        role="button"
        tabIndex={0}
        aria-label={`Open file: ${name ?? 'file'}`}
        onKeyDown={handleKeyDown}
      >
        <FileIcon className="size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name ?? 'File'}</p>
          {size !== undefined && (
            <p className="text-xs text-muted-foreground">{humanSize(size)}</p>
          )}
        </div>
      </div>
      {children}
    </PlateElement>
  );
}

export function PlaceholderElement({ element, children, ...props }: PlateElementProps) {
  const name = element['name'] as string | undefined;

  return (
    <PlateElement {...props} element={element} className="my-3">
      <div contentEditable={false} className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3">
        <Skeleton className="size-8 shrink-0 rounded" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-3/4 rounded" />
          {name && (
            <p className="text-xs text-muted-foreground truncate">{name}</p>
          )}
        </div>
        <div className="size-4 animate-spin rounded-full border-2 border-border border-t-primary shrink-0" />
      </div>
      {children}
    </PlateElement>
  );
}

export function ImageElementWithCaption({ element, children, ...props }: PlateElementProps) {
  const url = element['url'] as string | undefined;
  const captionState = useCaptionState();

  return (
    <PlateElement {...props} element={element} as="figure" className="my-3">
      <div contentEditable={false}>
        {url ? (
          <img
            src={url}
            alt=""
            className="max-w-full h-auto rounded-md border border-border"
          />
        ) : (
          <div className="flex h-24 items-center justify-center rounded-md border-2 border-dashed border-border text-sm text-muted-foreground">
            No image URL
          </div>
        )}
      </div>
      <Caption options={{ readOnly: captionState.readOnly }}>
        <CaptionTextarea placeholder="Add a caption..." />
      </Caption>
      {children}
    </PlateElement>
  );
}
