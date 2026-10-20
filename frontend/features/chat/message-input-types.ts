import type { Message } from "@/types/chat";
import type { MentionCandidate } from "./use-chat-mentions";
import type { MentionPrompt, RecordPickerState } from "./use-message-composer";
import type { LinkedRecordDraft } from "./composer-draft";
import type { RecordSearchResult } from "./linked-record-meta";

export type PendingAttachment = {
  fileName: string;
  fileUrl: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
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
  mentionIndex: number;
  filteredMentions: MentionCandidate[];
  insertMention: (candidate: MentionCandidate) => void;
  mentionPrompt: MentionPrompt | null;
  onDismissMentionPrompt: () => void;

  recordPicker: RecordPickerState | null;
  onSelectRecord: (record: RecordSearchResult) => void;
  linkedRecords: LinkedRecordDraft[];
  onRemoveLinkedRecord: (key: string) => void;

  typingText: string | null;

  sendMessage: { isPending: boolean };
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onFilesSelected?: (files: File[]) => void;
}
