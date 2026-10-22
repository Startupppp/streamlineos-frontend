import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from "react";
import type React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const storageUploadContract = lazyContract(() =>
  import("@/hooks/api/chat-extra-schema").then((m) => m.storageUploadContract),
);
import { getErrorMessage } from "@/lib/get-error-message";
import {
  CHAT_ATTACHMENT_MAX_BYTES,
  CHAT_ATTACHMENT_SUMMARY,
  isAllowedChatAttachment,
} from "./chat-attachment-types";
import type { AttachmentInput, EditMessageInput, EntityRef, Message, SendMessageInput } from "@/types/chat";
import type { ChatChannelDetailWire } from "@/hooks/api/chat-extra-schema";
import { seedLinkedRecordPreview } from "@/hooks/api/chat-reference-cards";
import { GLOBAL_SEARCH_MIN_LENGTH, useGlobalSearch } from "@/components/command-palette/hooks/use-global-search";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useChatMentions, type MentionCandidate } from "./use-chat-mentions";
import { useChatOutbox } from "./use-chat-offline-queue";
import { onOutboxDelivered } from "./chat-outbox-delivery";
import { LINKED_RECORD_LIMIT, linksKeyFor, readDraftLinks, readDraftText, type LinkedRecordDraft } from "./composer-draft";
import { RECORD_SEARCH_TYPES, groupRecordResults, type RecordGroup, type RecordSearchResult } from "./linked-record-meta";

type Attachment = AttachmentInput;

export interface RecordPickerState {
  query: string;
  groups: RecordGroup[];
  activeIndex: number;
  isSearching: boolean;
  isError: boolean;
  retry: () => void;
}

export interface MentionPrompt {
  userId: string;
  name: string;
}

interface PendingMentionPrompt extends MentionPrompt {
  token: string;
}

const RECORD_TRIGGER = /(?:^|\s)\/([^\s/]*)$/;
const MENTION_TRIGGER = /(?:^|\s)@([^\s@]*)$/;

function asksBeforeMentioning(channelType: ChatChannelDetailWire["type"] | undefined): boolean {
  return channelType === "PRIVATE" || channelType === "GROUP";
}

export function useMessageComposer({
  channelId, draftKey, isOnline, sendMessage, editMessage, markRead, scrollToBottom,
  publishTyping, channel, currentUserId,
}: {
  channelId: number; draftKey: string; isOnline: boolean;
  sendMessage: { mutateAsync: (input: SendMessageInput) => Promise<unknown> };
  editMessage: { mutateAsync: (input: EditMessageInput & { channelId: number }) => Promise<unknown> };
  markRead: { mutate: (input: { channelId: number }) => void };
  scrollToBottom: (behavior?: ScrollBehavior) => void; publishTyping: () => void;
  channel: ChatChannelDetailWire | undefined; currentUserId: string;
}) {
  const queryClient = useQueryClient();
  const [messageInput, setMessageInput] = useState(() => readDraftText(draftKey));
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editInput, setEditInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [pendingPrompt, setMentionPrompt] = useState<PendingMentionPrompt | null>(null);
  const [recordQuery, setRecordQuery] = useState<string | null>(null);
  const [recordIndex, setRecordIndex] = useState(0);
  const [linkState, setLinkState] = useState(() => ({ draftKey, records: readDraftLinks(draftKey) }));
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const lastTypingSent = useRef(0);
  const pendingMentionsRef = useRef<Map<string, string>>(new Map());
  const outbox = useChatOutbox({ channelId, draftKey, isOnline, mutateAsync: sendMessage.mutateAsync });

  const filteredMentions = useChatMentions({ channel, currentUserId, query: mentionQuery, enabled: showMentions });
  const activeMentionIndex = Math.max(0, Math.min(mentionIndex, filteredMentions.length - 1));

  const debouncedRecordQuery = useDebouncedValue(recordQuery ?? "", 300);
  const recordSearch = useGlobalSearch(recordQuery === null ? "" : debouncedRecordQuery, RECORD_SEARCH_TYPES);
  const recordQueryReady = recordQuery !== null && recordQuery.trim().length >= GLOBAL_SEARCH_MIN_LENGTH;
  const recordGroups = useMemo(
    () => (recordQueryReady ? groupRecordResults(recordSearch.results) : []),
    [recordQueryReady, recordSearch.results],
  );
  const recordOptions = useMemo(() => recordGroups.flatMap((group) => group.items), [recordGroups]);
  const activeRecordIndex = recordOptions.length > 0 ? Math.min(recordIndex, recordOptions.length - 1) : -1;
  const recordPicker = useMemo<RecordPickerState | null>(
    () =>
      recordQuery === null
        ? null
        : {
            query: recordQuery,
            groups: recordGroups,
            activeIndex: activeRecordIndex,
            isSearching: recordSearch.isSearching || recordQuery.trim() !== debouncedRecordQuery.trim(),
            isError: recordSearch.isError,
            retry: recordSearch.retry,
          },
    [recordQuery, recordGroups, activeRecordIndex, recordSearch.isSearching, recordSearch.isError, recordSearch.retry, debouncedRecordQuery],
  );

  const mentionPrompt = useMemo<MentionPrompt | null>(
    () =>
      pendingPrompt && messageInput.includes(pendingPrompt.token)
        ? { userId: pendingPrompt.userId, name: pendingPrompt.name }
        : null,
    [pendingPrompt, messageInput],
  );

  const linkedRecords = useMemo(
    () => (linkState.draftKey === draftKey ? linkState.records : readDraftLinks(draftKey)),
    [linkState, draftKey],
  );
  const setLinkedRecords = useCallback((next: SetStateAction<LinkedRecordDraft[]>) => {
    setLinkState((prev) => {
      const base = prev.draftKey === draftKey ? prev.records : readDraftLinks(draftKey);
      return { draftKey, records: typeof next === "function" ? next(base) : next };
    });
  }, [draftKey]);

  useEffect(() => {
    const key = linksKeyFor(linkState.draftKey);
    if (linkState.records.length) localStorage.setItem(key, JSON.stringify(linkState.records));
    else localStorage.removeItem(key);
  }, [linkState]);

  const uploadFiles = useCallback(async (files: File[]) => {
    setUploading(true);
    try {
      for (const file of files) {
        if (file.size > CHAT_ATTACHMENT_MAX_BYTES) { toast.error(`${file.name} is too large (max 10MB)`); continue; }
        if (!isAllowedChatAttachment(file)) { toast.error(`${file.name} is not a supported file type. Attach ${CHAT_ATTACHMENT_SUMMARY}.`); continue; }
        const formData = new FormData(); formData.append("file", file); formData.append("folder", "chat");
        try {
          const result = await apiClient.upload<{ key: string; size?: number; mimeType?: string }>("/storage/upload", formData, storageUploadContract);
          setPendingAttachments((prev) => [...prev, { fileName: file.name, fileUrl: result.key, fileKey: result.key, fileSize: result.size ?? file.size, mimeType: result.mimeType ?? file.type }]);
        } catch (error) { toast.error(`Failed: ${getErrorMessage(error) || file.name}`); }
      }
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setUploading(false); }
  }, []);
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) await uploadFiles(Array.from(e.target.files));
    e.target.value = "";
  }, [uploadFiles]);
  const handlePastedFiles = useCallback((files: File[]) => uploadFiles(files), [uploadFiles]);

  const insertEmoji = useCallback((emoji: string) => {
    const el = inputRef.current; const start = el?.selectionStart ?? messageInput.length; const end = el?.selectionEnd ?? messageInput.length;
    setMessageInput((value) => value.slice(0, start) + emoji + value.slice(end)); setShowEmojiPicker(false);
    setTimeout(() => { el?.focus(); el?.setSelectionRange(start + emoji.length, start + emoji.length); }, 0);
  }, [messageInput]);
  const insertMention = useCallback((candidate: MentionCandidate) => {
    const name = candidate.name ?? "";
    if (name) pendingMentionsRef.current.set(name, candidate.id); const el = inputRef.current;
    const cursor = el?.selectionStart ?? messageInput.length; const at = messageInput.slice(0, cursor).lastIndexOf("@"); if (at < 0) return;
    const value = messageInput.slice(0, at) + `@${name} ` + messageInput.slice(cursor); setMessageInput(value); setShowMentions(false); setMentionQuery("");
    if (!candidate.isMember && asksBeforeMentioning(channel?.type)) setMentionPrompt({ userId: candidate.id, name: name || "This person", token: `@${name}` });
    setTimeout(() => { el?.focus(); const pos = at + name.length + 2; el?.setSelectionRange(pos, pos); }, 0);
  }, [messageInput, channel?.type]);
  const dismissMentionPrompt = useCallback(() => setMentionPrompt(null), []);
  const closeRecordPicker = useCallback(() => { setRecordQuery(null); setRecordIndex(0); }, []);
  const selectRecord = useCallback((result: RecordSearchResult) => {
    const el = inputRef.current;
    const cursor = el?.selectionStart ?? messageInput.length;
    const slash = messageInput.slice(0, cursor).lastIndexOf("/");
    const caret = slash >= 0 ? slash : cursor;
    if (slash >= 0) setMessageInput(messageInput.slice(0, slash) + messageInput.slice(cursor));
    closeRecordPicker();
    const draft: LinkedRecordDraft = { key: `${result.type}:${result.id}`, type: result.type, id: String(result.id), title: result.title, subtitle: result.subtitle, href: result.href };
    if (linkedRecords.length >= LINKED_RECORD_LIMIT && !linkedRecords.some((r) => r.key === draft.key)) toast.info(`A message can link up to ${LINKED_RECORD_LIMIT} records.`);
    setLinkedRecords((prev) => (prev.some((r) => r.key === draft.key) || prev.length >= LINKED_RECORD_LIMIT ? prev : [...prev, draft]));
    setTimeout(() => { el?.focus(); el?.setSelectionRange(caret, caret); }, 0);
  }, [messageInput, linkedRecords, closeRecordPicker, setLinkedRecords]);
  const removeLinkedRecord = useCallback((key: string) => {
    setLinkedRecords((prev) => prev.filter((r) => r.key !== key));
  }, [setLinkedRecords]);

  const handleSend = useCallback(async () => {
    const content = messageInput.trim(); if (!content && !pendingAttachments.length && !linkedRecords.length) return;
    const attachments = [...pendingAttachments], records = [...linkedRecords]; const replyToId = replyTo?.id;
    const entities = records.map(({ type, id }): EntityRef => ({ type, id }));
    const metadata = entities.length ? { entities } : undefined;
    const mentions = new Map(pendingMentionsRef.current);
    const mentionedUserIds = [...new Set([...mentions].filter(([name]) => content.includes(`@${name}`)).map(([, id]) => id))];
    const clientKey = crypto.randomUUID();
    for (const record of records) seedLinkedRecordPreview(queryClient, { type: record.type, id: record.id, title: record.title, subtitle: record.subtitle, status: null, href: record.href });
    const entry = { content, replyToId, attachments: attachments.length ? attachments : undefined, metadata, mentionedUserIds: mentionedUserIds.length ? mentionedUserIds : undefined, clientKey };
    setMessageInput(""); setPendingAttachments([]); setReplyTo(null); setLinkedRecords([]); setMentionPrompt(null);
    pendingMentionsRef.current = new Map();
    localStorage.removeItem(draftKey);
    if (!isOnline) toast.info("You're offline — message will be sent when you reconnect");
    else scrollToBottom("smooth");
    const outcome = await outbox.enqueue(entry);
    if (outcome.status === "delivered") markRead.mutate({ channelId });
  }, [messageInput, pendingAttachments, linkedRecords, replyTo, draftKey, isOnline, outbox, channelId, markRead, scrollToBottom, queryClient, setLinkedRecords]);
  useEffect(() => onOutboxDelivered((sentDraftKey, entry) => {
    if (sentDraftKey !== draftKey || !entry.content) return;
    if (readDraftText(draftKey).trim() === entry.content) localStorage.removeItem(draftKey);
    setMessageInput((current) => (current.trim() === entry.content ? "" : current));
  }), [draftKey]);
  const handleEdit = useCallback(async (messageId: number) => { const content = editInput.trim(); if (!content) return; try { await editMessage.mutateAsync({ channelId, messageId, content }); setEditingMessage(null); setEditInput(""); } catch (error) { toast.error(getErrorMessage(error)); } }, [editInput, editMessage, channelId]);
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value; setMessageInput(value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
    if (value.trim() && Date.now() - lastTypingSent.current > 3000) { lastTypingSent.current = Date.now(); publishTyping(); }
    const before = value.slice(0, e.target.selectionStart ?? value.length); const record = before.match(RECORD_TRIGGER); const at = record ? null : before.match(MENTION_TRIGGER);
    if (record) { setRecordQuery(record[1]); setRecordIndex(0); setShowMentions(false); setMentionQuery(""); }
    else { setRecordQuery(null); setShowMentions(!!at); setMentionQuery(at?.[1] ?? ""); setMentionIndex(0); }
  }, [publishTyping]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (recordPicker) {
      const count = recordOptions.length;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (count) setRecordIndex((activeRecordIndex + (e.key === "ArrowDown" ? 1 : -1) + count) % count); return; }
      if (e.key === "Escape") { e.preventDefault(); closeRecordPicker(); return; }
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (count) selectRecord(recordOptions[Math.max(activeRecordIndex, 0)]); return; }
      if (e.key === "Tab" && count) { e.preventDefault(); selectRecord(recordOptions[Math.max(activeRecordIndex, 0)]); return; }
    }
    const mentions = filteredMentions;
    if (showMentions && mentions.length) { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((activeMentionIndex + (e.key === "ArrowDown" ? 1 : -1) + mentions.length) % mentions.length); return; } if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(mentions[activeMentionIndex]); return; } if (e.key === "Escape") { setShowMentions(false); return; } }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); }
  }, [recordPicker, recordOptions, activeRecordIndex, closeRecordPicker, selectRecord, filteredMentions, showMentions, activeMentionIndex, insertMention, handleSend]);

  return { messageInput, setMessageInput, replyTo, setReplyTo, editingMessage, setEditingMessage, editInput, setEditInput, pendingAttachments, setPendingAttachments, uploading, showEmojiPicker, setShowEmojiPicker, showMentions, setShowMentions, mentionIndex: activeMentionIndex, filteredMentions, mentionPrompt, dismissMentionPrompt, recordPicker, selectRecord, linkedRecords, removeLinkedRecord, inputRef, fileInputRef, emojiRef, handleFileSelect, handlePastedFiles, insertEmoji, insertMention, handleSend, handleEdit, handleInputChange, handleKeyDown, flushMessageQueue: outbox.flush };
}
