"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface MentionUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  users: MentionUser[];
  disabled?: boolean;
  rows?: number;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function MentionTextarea({
  value,
  onChange,
  onKeyDown,
  placeholder,
  className,
  users,
  disabled,
  rows = 3,
}: MentionTextareaProps) {
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filtered = useMemo(
    () =>
      mentionSearch !== null
        ? users
            .filter((u) =>
              u.name.toLowerCase().includes(mentionSearch.toLowerCase()),
            )
            .slice(0, 5)
        : [],
    [users, mentionSearch],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      onChange(text);
      const cursor = e.target.selectionStart ?? 0;
      const beforeCursor = text.slice(0, cursor);
      const atMatch = beforeCursor.match(/@(\w*)$/);
      if (atMatch) {
        setMentionSearch(atMatch[1]);
        setMentionStart(cursor - atMatch[0].length);
        setSelectedIdx(0);
      } else {
        setMentionSearch(null);
      }
    },
    [onChange],
  );

  const insertMention = useCallback(
    (user: MentionUser) => {
      const cursorPos =
        textareaRef.current?.selectionStart ??
        mentionStart + (mentionSearch?.length ?? 0) + 1;
      const before = value.slice(0, mentionStart);
      const after = value.slice(cursorPos);
      const newValue = `${before}@${user.name} ${after}`;
      onChange(newValue);
      setMentionSearch(null);
      setTimeout(() => {
        textareaRef.current?.focus();
        const pos = before.length + user.name.length + 2;
        textareaRef.current?.setSelectionRange(pos, pos);
      }, 0);
    },
    [value, mentionStart, mentionSearch, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (mentionSearch !== null && filtered.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIdx((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          insertMention(filtered[selectedIdx]);
          return;
        }
        if (e.key === "Escape") {
          setMentionSearch(null);
          return;
        }
      }
      onKeyDown?.(e);
    },
    [mentionSearch, filtered, selectedIdx, insertMention, onKeyDown],
  );

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn("resize-none", className)}
        disabled={disabled}
        rows={rows}
        aria-label="Comment input"
        aria-autocomplete="list"
        aria-expanded={mentionSearch !== null && filtered.length > 0}
      />
      <AnimatePresence>
        {mentionSearch !== null && filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 left-0 mt-1 w-64 bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200/80 shadow-xl shadow-slate-200/60 overflow-hidden"
            role="listbox"
            aria-label="Mention suggestions"
          >
            {filtered.map((user, idx) => (
              <button
                key={user.id}
                type="button"
                role="option"
                aria-selected={idx === selectedIdx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(user);
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                  idx === selectedIdx
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted/60",
                )}
              >
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
