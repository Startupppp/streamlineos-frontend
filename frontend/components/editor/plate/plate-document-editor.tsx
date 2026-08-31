"use client";

import { useState, useEffect, useRef, useMemo, type DragEvent, type ClipboardEvent } from "react";
import {
  Plate,
  PlateContent,
  usePlateEditor,
} from "platejs/react";
import type { Value } from "platejs";
import {
  EditorPageContext,
  type EditorPageContextValue,
} from "./plate-context";
import { normalizePlateValue, getPlainText } from "./plate-value-convert";
import { FixedToolbar } from "./toolbar/fixed-toolbar";
import { uploadEditorMedia } from "./upload-media";
import type { EditorMediaUploader } from "./upload-media";
import { buildPlugins, MAX_FILES_PER_DROP } from "./plate-plugins";
import {
  usePageLinkPicker,
  PageLinkPickerDropdown,
} from "./plate-page-link-picker";

export interface PlateDocumentEditorProps {
  value?: unknown;
  onChange?: (value: unknown, plainText: string) => void;
  editable?: boolean;
  placeholder?: string;
  fetchMentionUsers?: (
    q: string,
  ) => Promise<Array<{ id: string; label: string }>>;
  fetchPageLinks?: (q: string) => Promise<Array<{ id: number; label: string }>>;
  onNavigateToPage?: (pageId: number) => void;
  contentKey?: string | number;
  uploadFile?: EditorMediaUploader;
}

export default function PlateDocumentEditor({
  value,
  onChange,
  editable = true,
  placeholder = "Start writing...",
  fetchMentionUsers,
  fetchPageLinks,
  onNavigateToPage,
  contentKey,
  uploadFile,
}: PlateDocumentEditorProps) {
  const [initialValue] = useState(() => normalizePlateValue(value));

  const editor = usePlateEditor({
    plugins: buildPlugins(),
    value: initialValue,
  });

  const prevKeyRef = useRef<string | number | undefined>(contentKey);

  useEffect(() => {
    if (prevKeyRef.current !== contentKey && contentKey !== undefined) {
      prevKeyRef.current = contentKey;
      const next = normalizePlateValue(value);
      editor.tf.reset();
      editor.tf.insertNodes(next);
    }
  }, [contentKey, value, editor]);

  const { picker, checkTrigger, selectPageLink, dismissPicker } =
    usePageLinkPicker(editor);

  function handleChange({ value: v }: { value: Value }) {
    const plainText = getPlainText(v);
    onChange?.(v, plainText);
    setTimeout(checkTrigger, 0);
  }

  function uploadDroppedFiles(files: FileList) {
    if (!uploadFile) return;
    Array.from(files)
      .slice(0, MAX_FILES_PER_DROP)
      .forEach((file) => {
        void uploadEditorMedia(editor, file, uploadFile);
      });
  }

  function handleContentDrop(e: DragEvent<HTMLDivElement>) {
    if (!editable || !uploadFile) return;
    if (e.dataTransfer.files.length === 0) return;
    e.preventDefault();
    e.stopPropagation();
    uploadDroppedFiles(e.dataTransfer.files);
  }

  function handleContentPaste(e: ClipboardEvent<HTMLDivElement>) {
    if (!editable || !uploadFile) return;
    if (e.clipboardData.files.length === 0) return;
    e.preventDefault();
    e.stopPropagation();
    uploadDroppedFiles(e.clipboardData.files);
  }

  const contextValue = useMemo<EditorPageContextValue>(
    () => ({ fetchMentionUsers, fetchPageLinks, onNavigateToPage }),
    [fetchMentionUsers, fetchPageLinks, onNavigateToPage],
  );

  return (
    <EditorPageContext.Provider value={contextValue}>
      <Plate editor={editor} onChange={handleChange}>
        <FixedToolbar uploadFile={uploadFile} />
        <PlateContent
          placeholder={placeholder}
          readOnly={!editable}
          className="plate-editor min-h-[150px] outline-none px-1 py-2"
          onDropCapture={handleContentDrop}
          onPasteCapture={handleContentPaste}
        />
        {picker && (
          <PageLinkPickerDropdown
            picker={picker}
            fetchPageLinks={fetchPageLinks}
            onSelect={selectPageLink}
            onDismiss={dismissPicker}
          />
        )}
      </Plate>
    </EditorPageContext.Provider>
  );
}
