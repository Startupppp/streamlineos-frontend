'use client';

import { ExternalLink, Link, Text, Unlink } from 'lucide-react';
import {
  FloatingLinkUrlInput,
  LinkOpenButton,
  useFloatingLinkEdit,
  useFloatingLinkEditState,
  useFloatingLinkInsert,
  useFloatingLinkInsertState,
} from '@platejs/link/react';
import { Separator } from '@/components/ui/separator';

const popoverClass =
  'z-50 w-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none';

const inputClass =
  'flex h-8 w-full rounded-md bg-transparent px-1.5 text-sm outline-none placeholder:text-muted-foreground';

const actionButtonClass =
  'flex h-8 items-center gap-1.5 rounded-sm px-2 text-sm hover:bg-accent hover:text-accent-foreground';

export function LinkFloatingToolbar() {
  const insertState = useFloatingLinkInsertState();
  const {
    hidden,
    props: insertProps,
    ref: insertRef,
    textInputProps,
  } = useFloatingLinkInsert(insertState);

  const editState = useFloatingLinkEditState();
  const {
    editButtonProps,
    props: editProps,
    ref: editRef,
    unlinkButtonProps,
  } = useFloatingLinkEdit(editState);

  if (hidden) return null;

  const input = (
    <div className="flex w-[300px] flex-col sm:w-[330px]">
      <div className="flex items-center gap-1.5 px-1.5">
        <Link className="size-4 shrink-0 text-muted-foreground" />
        <FloatingLinkUrlInput
          className={inputClass}
          placeholder="Paste link"
          data-plate-focus
        />
      </div>
      <Separator className="my-1" />
      <div className="flex items-center gap-1.5 px-1.5">
        <Text className="size-4 shrink-0 text-muted-foreground" />
        <input
          className={inputClass}
          placeholder="Text to display"
          data-plate-focus
          {...textInputProps}
        />
      </div>
    </div>
  );

  const editContent = editState.isEditing ? (
    input
  ) : (
    <div className="flex items-center">
      <button type="button" className={actionButtonClass} {...editButtonProps}>
        Edit link
      </button>
      <Separator orientation="vertical" className="mx-0.5 h-5" />
      <LinkOpenButton
        className={actionButtonClass}
        aria-label="Open link in a new tab"
      >
        <ExternalLink className="size-4" />
      </LinkOpenButton>
      <Separator orientation="vertical" className="mx-0.5 h-5" />
      <button
        type="button"
        className={actionButtonClass}
        aria-label="Remove link"
        {...unlinkButtonProps}
      >
        <Unlink className="size-4" />
      </button>
    </div>
  );

  return (
    <>
      <div ref={insertRef} className={popoverClass} {...insertProps}>
        {input}
      </div>
      <div ref={editRef} className={popoverClass} {...editProps}>
        {editContent}
      </div>
    </>
  );
}
