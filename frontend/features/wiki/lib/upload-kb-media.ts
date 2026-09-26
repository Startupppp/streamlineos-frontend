'use client';

import { apiClient } from '@/lib/api-client';
import { lazyContract } from '@/lib/api-envelope';
import { IDEMPOTENCY_HEADER, newIdempotencyKey } from '@/lib/idempotency-key';

const kbMediaUploadContract = lazyContract(() =>
  import('@/hooks/api/kb/kb-import-schema').then((m) => m.kbMediaUploadContract),
);
import type { UploadedEditorMedia } from '@/components/editor/plate/upload-media';

export type UploadedKbMedia = UploadedEditorMedia;

const IMAGE_MAX = 10 * 1024 * 1024;
const VIDEO_MAX = 100 * 1024 * 1024;
const AUDIO_MAX = 25 * 1024 * 1024;
const DOC_MAX = 25 * 1024 * 1024;

const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);

const AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
]);

const DOC_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv',
  'text/plain',
  'application/zip',
]);

function getValidationError(file: File): string | null {
  if (file.type === 'image/svg+xml') return 'SVG files are not allowed.';
  if (IMAGE_TYPES.has(file.type)) {
    return file.size > IMAGE_MAX ? 'Image too large (max 10 MB).' : null;
  }
  if (VIDEO_TYPES.has(file.type)) {
    return file.size > VIDEO_MAX ? 'Video too large (max 100 MB).' : null;
  }
  if (AUDIO_TYPES.has(file.type)) {
    return file.size > AUDIO_MAX ? 'Audio too large (max 25 MB).' : null;
  }
  if (DOC_TYPES.has(file.type)) {
    return file.size > DOC_MAX ? 'File too large (max 25 MB).' : null;
  }
  return `Unsupported file type: ${file.type || 'unknown'}`;
}

const mediaUploadKeys = new Map<string, string>();

function uploadSignature(file: File, pageId?: number): string {
  return `${pageId ?? ''}:${file.name}:${file.size}:${file.lastModified}:${file.type}`;
}

function idempotencyKeyFor(signature: string): string {
  const existing = mediaUploadKeys.get(signature);
  if (existing !== undefined) return existing;
  const minted = newIdempotencyKey();
  mediaUploadKeys.set(signature, minted);
  return minted;
}

export async function uploadKbMedia(file: File, pageId?: number): Promise<UploadedKbMedia> {
  const error = getValidationError(file);
  if (error) throw new Error(error);
  const fd = new FormData();
  fd.append('file', file);
  if (pageId != null) fd.append('pageId', String(pageId));

  const signature = uploadSignature(file, pageId);
  const uploaded = await apiClient.upload<UploadedKbMedia>('/kb/media', fd, kbMediaUploadContract, {
    headers: { [IDEMPOTENCY_HEADER]: idempotencyKeyFor(signature) },
  });
  mediaUploadKeys.delete(signature);
  return uploaded;
}
