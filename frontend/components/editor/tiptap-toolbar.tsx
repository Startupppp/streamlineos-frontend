"use client";

import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote,
  AlignLeft, AlignCenter, AlignRight,
  Link as LinkIcon, Undo, Redo, Image as ImageIcon,
} from "lucide-react";

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  children: React.ReactNode;
  title: string;
}

export function ToolbarButton({ onClick, isActive, children, title }: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          tabIndex={-1}
          aria-label={title}
          className={`h-8 w-8 ${isActive ? "bg-muted text-foreground" : "text-muted-foreground"}`}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {title}
      </TooltipContent>
    </Tooltip>
  );
}

interface TiptapToolbarProps {
  editor: Editor;
  onImageInsert?: () => void;
  compact?: boolean;
}

export function TiptapToolbar({ editor, onImageInsert, compact = false }: TiptapToolbarProps) {
  function handleBold() { editor.chain().focus().toggleBold().run(); }
  function handleItalic() { editor.chain().focus().toggleItalic().run(); }
  function handleUnderline() { editor.chain().focus().toggleUnderline().run(); }
  function handleStrike() { editor.chain().focus().toggleStrike().run(); }
  function handleH1() { editor.chain().focus().toggleHeading({ level: 1 }).run(); }
  function handleH2() { editor.chain().focus().toggleHeading({ level: 2 }).run(); }
  function handleH3() { editor.chain().focus().toggleHeading({ level: 3 }).run(); }
  function handleBulletList() { editor.chain().focus().toggleBulletList().run(); }
  function handleOrderedList() { editor.chain().focus().toggleOrderedList().run(); }
  function handleBlockquote() { editor.chain().focus().toggleBlockquote().run(); }
  function handleAlignLeft() { editor.chain().focus().setTextAlign("left").run(); }
  function handleAlignCenter() { editor.chain().focus().setTextAlign("center").run(); }
  function handleAlignRight() { editor.chain().focus().setTextAlign("right").run(); }
  function handleLink() {
    const url = window.prompt("Enter URL:");
    if (url) editor.chain().focus().setLink({ href: url }).run();
  }
  function handleUndo() { editor.chain().focus().undo().run(); }
  function handleRedo() { editor.chain().focus().redo().run(); }

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex flex-wrap items-center gap-0.5 p-1">
        {!compact && (
          <>
            <ToolbarButton onClick={handleUndo} title="Undo">
              <Undo className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={handleRedo} title="Redo">
              <Redo className="h-4 w-4" />
            </ToolbarButton>
            <Separator orientation="vertical" className="mx-1 h-6" />
          </>
        )}

        <ToolbarButton onClick={handleBold} isActive={editor.isActive("bold")} title="Bold">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={handleItalic} isActive={editor.isActive("italic")} title="Italic">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={handleUnderline} isActive={editor.isActive("underline")} title="Underline">
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={handleStrike} isActive={editor.isActive("strike")} title="Strikethrough">
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolbarButton onClick={handleH1} isActive={editor.isActive("heading", { level: 1 })} title="Heading 1">
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={handleH2} isActive={editor.isActive("heading", { level: 2 })} title="Heading 2">
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={handleH3} isActive={editor.isActive("heading", { level: 3 })} title="Heading 3">
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolbarButton onClick={handleBulletList} isActive={editor.isActive("bulletList")} title="Bullet List">
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={handleOrderedList} isActive={editor.isActive("orderedList")} title="Ordered List">
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={handleBlockquote} isActive={editor.isActive("blockquote")} title="Blockquote">
          <Quote className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolbarButton onClick={handleAlignLeft} isActive={editor.isActive({ textAlign: "left" })} title="Align Left">
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={handleAlignCenter} isActive={editor.isActive({ textAlign: "center" })} title="Align Center">
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={handleAlignRight} isActive={editor.isActive({ textAlign: "right" })} title="Align Right">
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolbarButton onClick={handleLink} isActive={editor.isActive("link")} title="Add Link">
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>

        {onImageInsert && (
          <ToolbarButton onClick={onImageInsert} title="Insert Image">
            <ImageIcon className="h-4 w-4" />
          </ToolbarButton>
        )}
      </div>
    </TooltipProvider>
  );
}
