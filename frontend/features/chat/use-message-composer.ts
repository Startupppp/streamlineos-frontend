import { useCallback, useRef, useState } from "react";
import type React from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const storageUploadContract = lazyContract(() =>
  import("@/hooks/api/chat-extra-schema").then((m) => m.storageUploadContract),
);
import { getErrorMessage } from "@/lib/get-error-message";
import type { Message, MessageMetadata, TicketEntityRef } from "./chat-types";
import type { TicketSearchResult } from "@/hooks/api/build";
import type { AttachmentInput, EditMessageInput, SendMessageInput } from "@/types/chat";

type Attachment = AttachmentInput;
type QueuedMessage = { content: string; replyToId?: number; metadata?: MessageMetadata; attachments?: Attachment[]; mentionedUserIds?: string[]; clientKey: string };

/**
 * Identity of one logical send: the draft the user can still see and change.
 * Derived fields (mentions, ticket entities) are deliberately excluded — they
 * are restored verbatim when a send fails, so they cannot distinguish two
 * attempts at the same draft, and including them would only risk minting a
 * fresh key for an unchanged draft and reintroducing the duplicate.
 */
function sendSignature(
  content: string,
  replyToId: number | undefined,
  attachments: Attachment[],
): string {
  return JSON.stringify([content, replyToId ?? null, attachments.map((a) => a.fileKey)]);
}

export function useMessageComposer({
  channelId, draftKey, isOnline, sendMessage, editMessage, markRead, scrollToBottom,
  publishTyping, filteredMentions,
}: {
  channelId: number; draftKey: string; isOnline: boolean;
  sendMessage: { mutateAsync: (input: SendMessageInput) => Promise<unknown> };
  editMessage: { mutateAsync: (input: EditMessageInput & { channelId: number }) => Promise<unknown> };
  markRead: { mutate: (input: { channelId: number }) => void };
  scrollToBottom: (behavior?: ScrollBehavior) => void; publishTyping: () => void;
  filteredMentions: Array<{ id: string; name?: string | null }>;
}) {
  const [messageInput, setMessageInput] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editInput, setEditInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [showTicketPicker, setShowTicketPicker] = useState(false);
  const [ticketQuery, setTicketQuery] = useState("");
  const [ticketSelectedIndex, setTicketSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const lastTypingSent = useRef(0);
  const messageQueue = useRef<QueuedMessage[]>([]);
  /**
   * The in-flight send's idempotency key, held past a failure. The composer
   * restores the draft when a send throws, so pressing send again on the
   * unchanged draft is a RETRY of a request that may already have committed —
   * the same key lets the server replay the winner instead of inserting a
   * second row. Edit the draft and the signature changes, so a genuinely
   * different message gets a genuinely different key.
   */
  const pendingSendRef = useRef<{ signature: string; clientKey: string } | null>(null);
  const pendingEntitiesRef = useRef<TicketEntityRef[]>([]);
  const pendingMentionsRef = useRef<Map<string, string>>(new Map());
  const filteredMentionsRef = useRef(filteredMentions);
  filteredMentionsRef.current = filteredMentions;

  const uploadFiles = useCallback(async (files: File[]) => {
    setUploading(true);
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} is too large (max 10MB)`); continue; }
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
  const insertMention = useCallback((name: string, userId: string) => {
    if (name) pendingMentionsRef.current.set(name, userId); const el = inputRef.current; if (!el) return;
    const cursor = el.selectionStart ?? messageInput.length; const at = messageInput.slice(0, cursor).lastIndexOf("@"); if (at < 0) return;
    const value = messageInput.slice(0, at) + `@${name} ` + messageInput.slice(cursor); setMessageInput(value); setShowMentions(false); setMentionQuery("");
    setTimeout(() => { el.focus(); const pos = at + name.length + 2; el.setSelectionRange(pos, pos); }, 0);
  }, [messageInput]);
  const insertTicket = useCallback((ticket: TicketSearchResult) => {
    const el = inputRef.current; if (!el) return; const token = `${ticket.projectKey}-${ticket.ticketNumber}`; const cursor = el.selectionStart ?? messageInput.length; const at = messageInput.slice(0, cursor).lastIndexOf("#"); if (at < 0) return;
    setMessageInput(messageInput.slice(0, at) + token + " " + messageInput.slice(cursor)); setShowTicketPicker(false); setTicketQuery(""); setTicketSelectedIndex(0);
    pendingEntitiesRef.current.push({ type: "ticket", id: String(ticket.id), projectId: ticket.projectId, ticketNumber: ticket.ticketNumber, projectKey: ticket.projectKey, title: ticket.title, status: ticket.status, priority: ticket.priority });
    setTimeout(() => { el.focus(); const pos = at + token.length + 1; el.setSelectionRange(pos, pos); }, 0);
  }, [messageInput]);

  const flushMessageQueue = useCallback(async () => {
    const queued = messageQueue.current;
    if (!queued.length) return;
    messageQueue.current = [];
    const failed: QueuedMessage[] = [];
    for (const msg of queued) {
      try {
        await sendMessage.mutateAsync({ channelId, clientKey: msg.clientKey, content: msg.content || undefined, replyToId: msg.replyToId, attachments: msg.attachments, metadata: msg.metadata, mentionedUserIds: msg.mentionedUserIds });
      } catch { failed.push(msg); }
    }
    if (!failed.length) return;
    messageQueue.current = [...failed, ...messageQueue.current];
    toast.error(failed.length === 1 ? "A message you wrote offline could not be sent. It will be retried on the next reconnect." : `${failed.length} messages you wrote offline could not be sent. They will be retried on the next reconnect.`);
  }, [channelId, sendMessage]);

  const handleSend = useCallback(async () => {
    const content = messageInput.trim(); if (!content && !pendingAttachments.length) return;
    const attachments = [...pendingAttachments], entities = [...pendingEntitiesRef.current]; const replyToMessage = replyTo; const replyToId = replyTo?.id;
    const metadata = entities.length ? { entities } : undefined;
    const mentions = new Map(pendingMentionsRef.current);
    const mentionedUserIds = [...new Set([...mentions].filter(([name]) => content.includes(`@${name}`)).map(([, id]) => id))];
    setMessageInput(""); localStorage.removeItem(draftKey); setReplyTo(null); setPendingAttachments([]); pendingEntitiesRef.current = []; pendingMentionsRef.current.clear();
    const signature = sendSignature(content, replyToId, attachments);
    const clientKey = pendingSendRef.current?.signature === signature ? pendingSendRef.current.clientKey : crypto.randomUUID();
    pendingSendRef.current = { signature, clientKey };
    if (!isOnline) { messageQueue.current.push({ content, replyToId, attachments: attachments.length ? attachments : undefined, metadata, mentionedUserIds: mentionedUserIds.length ? mentionedUserIds : undefined, clientKey }); pendingSendRef.current = null; toast.info("You're offline — message will be sent when you reconnect"); return; }
    try { await sendMessage.mutateAsync({ channelId, clientKey, content: content || undefined, replyToId, attachments: attachments.length ? attachments : undefined, metadata, mentionedUserIds: mentionedUserIds.length ? mentionedUserIds : undefined }); pendingSendRef.current = null; markRead.mutate({ channelId }); scrollToBottom("smooth"); }
    catch (error) {
      setMessageInput(content); setPendingAttachments(attachments); setReplyTo(replyToMessage); pendingEntitiesRef.current = entities; pendingMentionsRef.current = mentions;
      toast.error(getErrorMessage(error));
    }
  }, [messageInput, pendingAttachments, replyTo, draftKey, isOnline, sendMessage, channelId, markRead, scrollToBottom]);
  const handleEdit = useCallback(async (messageId: number) => { const content = editInput.trim(); if (!content) return; try { await editMessage.mutateAsync({ channelId, messageId, content }); setEditingMessage(null); setEditInput(""); } catch (error) { toast.error(getErrorMessage(error)); } }, [editInput, editMessage, channelId]);
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value; setMessageInput(value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
    if (value.trim() && Date.now() - lastTypingSent.current > 3000) { lastTypingSent.current = Date.now(); publishTyping(); }
    const before = value.slice(0, e.target.selectionStart ?? value.length); const hash = before.match(/#([^\s]*)$/); const at = before.match(/@(\w*)$/);
    if (hash) { setShowTicketPicker(true); setTicketQuery(hash[1]); setTicketSelectedIndex(0); setShowMentions(false); setMentionQuery(""); }
    else { setShowTicketPicker(false); setTicketQuery(""); setShowMentions(!!at); setMentionQuery(at?.[1] ?? ""); setMentionIndex(0); }
  }, [publishTyping]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showTicketPicker && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Escape")) { e.preventDefault(); if (e.key === "Escape") setShowTicketPicker(false); else setTicketSelectedIndex((i) => Math.max(0, Math.min(i + (e.key === "ArrowDown" ? 1 : -1), 9))); return; }
    const mentions = filteredMentionsRef.current;
    if (showMentions && mentions.length) { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + mentions.length) % mentions.length); return; } if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); const user = mentions[mentionIndex]; insertMention(user.name ?? "", user.id); return; } if (e.key === "Escape") { setShowMentions(false); return; } }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); }
  }, [showTicketPicker, showMentions, mentionIndex, insertMention, handleSend]);

  return { messageInput, setMessageInput, replyTo, setReplyTo, editingMessage, setEditingMessage, editInput, setEditInput, pendingAttachments, setPendingAttachments, uploading, showEmojiPicker, setShowEmojiPicker, showMentions, setShowMentions, mentionQuery, setMentionQuery, mentionIndex, setMentionIndex, showTicketPicker, setShowTicketPicker, ticketQuery, setTicketQuery, ticketSelectedIndex, setTicketSelectedIndex, inputRef, fileInputRef, emojiRef, messageQueue, pendingEntitiesRef, pendingMentionsRef, setFilteredMentions: (value: typeof filteredMentions) => { filteredMentionsRef.current = value; }, handleFileSelect, handlePastedFiles, insertEmoji, insertMention, insertTicket, handleSend, handleEdit, handleInputChange, handleKeyDown };
}
