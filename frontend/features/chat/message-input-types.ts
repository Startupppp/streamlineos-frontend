import type { Message } from "./chat-types";
import type { TicketSearchResult } from "@/hooks/api/build";

export type PendingAttachment = {
  fileName: string;
  fileUrl: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
};

export type OrgUser = {
  id: string;
  name?: string | null;
  image?: string | null;
  role?: string | null;
};

export interface MessageInputProps {
  channelId: number;
  displayName: string;
  channelType: string | undefined;

  messageInput: string;
  setMessageInput: (v: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;

  replyTo: Message | null;
  setReplyTo: (msg: Message | null) => void;

  pendingAttachments: PendingAttachment[];
  setPendingAttachments: React.Dispatch<React.SetStateAction<PendingAttachment[]>>;
  uploading: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;

  showEmojiPicker: boolean;
  setShowEmojiPicker: React.Dispatch<React.SetStateAction<boolean>>;
  emojiRef: React.RefObject<HTMLDivElement | null>;
  insertEmoji: (emoji: string) => void;

  showMentions: boolean;
  setShowMentions: React.Dispatch<React.SetStateAction<boolean>>;
  mentionQuery: string;
  mentionIndex: number;
  setMentionIndex: React.Dispatch<React.SetStateAction<number>>;
  filteredMentions: OrgUser[];
  insertMention: (name: string, userId: string) => void;

  showTicketPicker: boolean;
  ticketQuery: string;
  ticketSelectedIndex: number;
  onTicketSelect: (ticket: TicketSearchResult) => void;

  typingText: string | null;

  sendMessage: { isPending: boolean };
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onFilesSelected?: (files: File[]) => void;
}
