'use client';

import { PlateLeaf } from 'platejs/react';
import type { PlateLeafProps } from 'platejs/react';

export function BoldLeaf({ children, ...props }: PlateLeafProps) {
  return (
    <PlateLeaf {...props}>
      <strong>{children}</strong>
    </PlateLeaf>
  );
}

export function ItalicLeaf({ children, ...props }: PlateLeafProps) {
  return (
    <PlateLeaf {...props}>
      <em>{children}</em>
    </PlateLeaf>
  );
}

export function UnderlineLeaf({ children, ...props }: PlateLeafProps) {
  return (
    <PlateLeaf {...props}>
      <u>{children}</u>
    </PlateLeaf>
  );
}

export function StrikethroughLeaf({ children, ...props }: PlateLeafProps) {
  return (
    <PlateLeaf {...props}>
      <s>{children}</s>
    </PlateLeaf>
  );
}

export function CodeLeaf({ children, ...props }: PlateLeafProps) {
  return (
    <PlateLeaf {...props}>
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
        {children}
      </code>
    </PlateLeaf>
  );
}
