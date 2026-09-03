'use client';

import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Film, Music, FileUp, Link2 } from 'lucide-react';
import { useEditorRef } from 'platejs/react';
import type { TElement } from 'platejs';
import type { UploadedEditorMedia } from '@/components/editor/plate/upload-media';
import { uploadEditorMedia } from '../upload-media';
import type { EditorMediaType } from '../upload-media';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToolbarButton } from './toolbar-button';

interface MediaButtonsProps {
  uploadFile: (file: File) => Promise<UploadedEditorMedia>;
}

type EmbedMediaType = 'img' | 'video' | 'audio';

interface EmbedDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (url: string, type: EmbedMediaType) => void;
}

function EmbedDialog({ open, onClose, onSubmit }: EmbedDialogProps) {
  const [url, setUrl] = useState('');
  const [mediaType, setMediaType] = useState<EmbedMediaType>('img');

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    setUrl(e.target.value);
  }

  function handleSubmit() {
    const trimmed = url.trim();
    if (!trimmed) return;
    onSubmit(trimmed, mediaType);
    setUrl('');
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSubmit();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Embed media from URL</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 px-0 py-2">
          <div className="flex gap-2">
            {(['img', 'video', 'audio'] as EmbedMediaType[]).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={mediaType === t ? 'default' : 'outline'}
                onClick={() => setMediaType(t)}
                className="flex-1 capitalize"
              >
                {t === 'img' ? 'Image' : t}
              </Button>
            ))}
          </div>
          <Input
            placeholder="Paste URL here..."
            value={url}
            onChange={handleUrlChange}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!url.trim()}>
            Embed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MediaButtons({ uploadFile }: MediaButtonsProps) {
  const editor = useEditorRef();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [embedOpen, setEmbedOpen] = useState(false);

  function doUpload(file: File, mediaType: EditorMediaType) {
    void uploadEditorMedia(editor, file, uploadFile, mediaType);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) doUpload(file, 'img');
    e.target.value = '';
  }

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) doUpload(file, 'video');
    e.target.value = '';
  }

  function handleAudioChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) doUpload(file, 'audio');
    e.target.value = '';
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) doUpload(file, 'file');
    e.target.value = '';
  }

  function handleImageClick() {
    imageInputRef.current?.click();
  }

  function handleVideoClick() {
    videoInputRef.current?.click();
  }

  function handleAudioClick() {
    audioInputRef.current?.click();
  }

  function handleFileClick() {
    fileInputRef.current?.click();
  }

  function handleEmbedSubmit(url: string, type: EmbedMediaType) {
    editor.tf.insertNodes({
      type,
      url,
      children: [{ text: '' }],
    } as TElement);
  }

  function openEmbed() {
    setEmbedOpen(true);
  }

  function closeEmbed() {
    setEmbedOpen(false);
  }

  return (
    <>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleImageChange}
        aria-hidden
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm"
        className="hidden"
        onChange={handleVideoChange}
        aria-hidden
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/mp4,audio/x-m4a"
        className="hidden"
        onChange={handleAudioChange}
        aria-hidden
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip"
        className="hidden"
        onChange={handleFileChange}
        aria-hidden
      />
      <ToolbarButton tooltip="Upload image" onClick={handleImageClick} aria-label="Upload image">
        <ImageIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton tooltip="Upload video" onClick={handleVideoClick} aria-label="Upload video">
        <Film className="size-4" />
      </ToolbarButton>
      <ToolbarButton tooltip="Upload audio" onClick={handleAudioClick} aria-label="Upload audio">
        <Music className="size-4" />
      </ToolbarButton>
      <ToolbarButton tooltip="Upload file" onClick={handleFileClick} aria-label="Upload file">
        <FileUp className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        tooltip="Embed from URL"
        aria-label="Embed media from URL"
        onClick={openEmbed}
      >
        <Link2 className="size-4" />
      </ToolbarButton>
      <EmbedDialog
        open={embedOpen}
        onClose={closeEmbed}
        onSubmit={handleEmbedSubmit}
      />
    </>
  );
}
