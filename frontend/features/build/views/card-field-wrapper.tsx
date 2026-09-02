"use client";

interface InlineFieldWrapperProps {
  children: React.ReactNode;
}

/**
 * An inline editor sits inside a clickable row or card. Without the keyboard
 * half of this shield, pressing Enter or Space inside the editor also fires the
 * row's activation and navigates away from the field being edited.
 */
export function stopEvent(e: React.MouseEvent | React.KeyboardEvent) {
  e.stopPropagation();
}

export function InlineFieldWrapper({ children }: InlineFieldWrapperProps) {
  return (
    <span onMouseDown={stopEvent} onClick={stopEvent} onKeyDown={stopEvent}>
      {children}
    </span>
  );
}

export function InlineFieldCell({ children }: InlineFieldWrapperProps) {
  return (
    <div onMouseDown={stopEvent} onClick={stopEvent} onKeyDown={stopEvent}>
      {children}
    </div>
  );
}
