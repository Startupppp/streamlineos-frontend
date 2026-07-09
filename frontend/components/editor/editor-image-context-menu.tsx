"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { viewFile, downloadFile } from "@/hooks/common/use-file-url";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

interface Position {
  x: number;
  y: number;
}

interface EditorImageContextMenuProps {
  editor: Editor;
  position: Position;
  imageUrl: string;
  onClose: () => void;
}

async function copyImageToClipboard(url: string): Promise<void> {
  const response = await fetch(url);
  const blob = await response.blob();
  const item = new ClipboardItem({ [blob.type]: blob });
  await navigator.clipboard.write([item]);
}

async function copyLinkToClipboard(url: string): Promise<void> {
  await navigator.clipboard.writeText(url);
}

export function EditorImageContextMenu({
  editor,
  position,
  imageUrl,
  onClose,
}: EditorImageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  function handleViewImage() {
    onClose();
    void viewFile(imageUrl);
  }

  function handleDownload() {
    onClose();
    void downloadFile(imageUrl);
  }

  async function handleCopyImage() {
    onClose();
    try {
      await copyImageToClipboard(imageUrl);
      toast.success("Image copied to clipboard");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleCopyLink() {
    onClose();
    try {
      await copyLinkToClipboard(imageUrl);
      toast.success("Link copied to clipboard");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function handleDelete() {
    onClose();
    const { state } = editor;
    const { doc, tr } = state;
    let deleted = false;
    doc.descendants((node, pos) => {
      if (deleted) return false;
      if (node.type.name === "image" && node.attrs["src"] === imageUrl) {
        editor.view.dispatch(tr.delete(pos, pos + node.nodeSize));
        deleted = true;
        return false;
      }
      return true;
    });
  }

  const menuContent = (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-50 min-w-[160px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      style={{ top: position.y, left: position.x }}
    >
      <button
        role="menuitem"
        type="button"
        className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
        onClick={handleViewImage}
      >
        View image
      </button>
      <button
        role="menuitem"
        type="button"
        className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
        onClick={handleDownload}
      >
        Download
      </button>
      <button
        role="menuitem"
        type="button"
        className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
        onClick={() => void handleCopyImage()}
      >
        Copy image
      </button>
      <button
        role="menuitem"
        type="button"
        className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
        onClick={() => void handleCopyLink()}
      >
        Copy link
      </button>
      <div className="my-1 h-px bg-muted" />
      <button
        role="menuitem"
        type="button"
        className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-destructive"
        onClick={handleDelete}
      >
        Delete
      </button>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(menuContent, document.body);
}
