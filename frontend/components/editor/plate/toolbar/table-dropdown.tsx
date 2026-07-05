'use client';

import React from 'react';
import { Table } from 'lucide-react';
import { useEditorRef } from 'platejs/react';
import { TablePlugin } from '@platejs/table/react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ToolbarButton } from './toolbar-button';

export function TableDropdown() {
  const editor = useEditorRef();

  function handleInsertTable() {
    editor.getTransforms(TablePlugin).insert.table({ rowCount: 3, colCount: 3 });
  }

  function handleAddRow() {
    editor.getTransforms(TablePlugin).insert.tableRow();
  }

  function handleAddColumn() {
    editor.getTransforms(TablePlugin).insert.tableColumn();
  }

  function handleDeleteRow() {
    editor.getTransforms(TablePlugin).remove.tableRow();
  }

  function handleDeleteColumn() {
    editor.getTransforms(TablePlugin).remove.tableColumn();
  }

  function handleDeleteTable() {
    editor.getTransforms(TablePlugin).remove.table();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ToolbarButton tooltip="Table" aria-label="Table">
          <Table className="size-4" />
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={handleInsertTable}>
          Insert table (3×3)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleAddRow}>Add row</DropdownMenuItem>
        <DropdownMenuItem onClick={handleAddColumn}>Add column</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDeleteRow}>Delete row</DropdownMenuItem>
        <DropdownMenuItem onClick={handleDeleteColumn}>Delete column</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDeleteTable}
          className="text-destructive focus:text-destructive"
        >
          Delete table
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
