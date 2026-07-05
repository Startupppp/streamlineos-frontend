'use client';

import React from 'react';
import { Table } from 'lucide-react';
import { useEditorRef } from 'platejs/react';
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
    editor.tf.insert.table({ rowCount: 3, colCount: 3 });
  }

  function handleAddRow() {
    editor.tf.insert.tableRow();
  }

  function handleAddColumn() {
    editor.tf.insert.tableColumn();
  }

  function handleDeleteRow() {
    editor.tf.delete.tableRow();
  }

  function handleDeleteColumn() {
    editor.tf.delete.tableColumn();
  }

  function handleDeleteTable() {
    editor.tf.delete.table();
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
