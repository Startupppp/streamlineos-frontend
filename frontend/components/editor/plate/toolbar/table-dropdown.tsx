"use client";

import { type MouseEvent } from "react";
import { Table } from "lucide-react";
import { useEditorRef } from "platejs/react";
import {
  insertTable,
  insertTableRow,
  insertTableColumn,
  deleteTable,
  deleteRow,
  deleteColumn,
} from "@platejs/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export function TableDropdown() {
  const editor = useEditorRef();

  function handleMouseDown(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
  }

  function handleInsertTable() {
    insertTable(editor, { rowCount: 3, colCount: 3 });
  }

  function handleAddRow() {
    insertTableRow(editor);
  }

  function handleAddColumn() {
    insertTableColumn(editor);
  }

  function handleDeleteRow() {
    deleteRow(editor);
  }

  function handleDeleteColumn() {
    deleteColumn(editor);
  }

  function handleDeleteTable() {
    deleteTable(editor);
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Table"
              className="h-8 w-8 shrink-0"
              onMouseDown={handleMouseDown}
            >
              <Table className="size-4" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Table</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={handleInsertTable}>
          Insert table (3×3)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleAddRow}>Add row</DropdownMenuItem>
        <DropdownMenuItem onClick={handleAddColumn}>
          Add column
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDeleteRow}>
          Delete row
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDeleteColumn}>
          Delete column
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive"
          onClick={handleDeleteTable}
        >
          Delete table
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
