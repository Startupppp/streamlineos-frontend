"use client";

interface InlineFieldWrapperProps {
  children: React.ReactNode;
}

export function stopEvent(e: React.MouseEvent | React.KeyboardEvent) {
  e.stopPropagation();
}

export function InlineFieldWrapper({ children }: InlineFieldWrapperProps) {
  return (
    <span onMouseDown={stopEvent} onClick={stopEvent}>
      {children}
    </span>
  );
}
