'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

interface ToolbarButtonProps {
  tooltip: string;
  isActive?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  'aria-label'?: string;
}

function stopDefault(e: React.MouseEvent) {
  e.preventDefault();
}

export function ToolbarButton({
  tooltip,
  isActive,
  disabled,
  onClick,
  children,
  'aria-label': ariaLabel,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={ariaLabel ?? tooltip}
          aria-pressed={isActive}
          disabled={disabled}
          onClick={onClick}
          onMouseDown={stopDefault}
          className={cn(
            'h-8 w-8 shrink-0',
            isActive && 'bg-accent text-accent-foreground',
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
