"use client";

import { useEffect, useRef } from "react";
import type React from "react";

export interface SuggestionDisplayItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface SuggestionListProps {
  items: SuggestionDisplayItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function SuggestionList({ items, selectedIndex, onSelect }: SuggestionListProps) {
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (items.length === 0) {
    return (
      <div className="tiptap-suggestion-popup">
        <div className="tiptap-suggestion-empty">No results</div>
      </div>
    );
  }

  return (
    <div className="tiptap-suggestion-popup">
      {items.map((item, index) => {
        const Icon = item.icon;
        const isSelected = index === selectedIndex;
        return (
          <button
            key={item.id}
            ref={isSelected ? selectedRef : null}
            type="button"
            data-selected={isSelected}
            className="tiptap-suggestion-item"
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(index);
            }}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
            <span className="tiptap-suggestion-item-label">{item.label}</span>
            {item.description && (
              <span className="tiptap-suggestion-item-description">{item.description}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface ImageUrlInputProps {
  onSubmit: (url: string) => void;
  onCancel: () => void;
}

export function ImageUrlInput({ onSubmit, onCancel }: ImageUrlInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = inputRef.current?.value.trim() ?? "";
      if (value) onSubmit(value);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  }

  function handleSubmit() {
    const value = inputRef.current?.value.trim() ?? "";
    if (value) onSubmit(value);
  }

  return (
    <div className="tiptap-suggestion-popup tiptap-image-input">
      <div className="tiptap-image-input-label">Image URL</div>
      <input
        ref={inputRef}
        type="url"
        placeholder="https://..."
        className="tiptap-image-input-field"
        onKeyDown={handleKeyDown}
      />
      <div className="tiptap-image-input-actions">
        <button type="button" className="tiptap-image-input-submit" onMouseDown={(e) => { e.preventDefault(); handleSubmit(); }}>
          Insert
        </button>
        <button type="button" className="tiptap-image-input-cancel" onMouseDown={(e) => { e.preventDefault(); onCancel(); }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
