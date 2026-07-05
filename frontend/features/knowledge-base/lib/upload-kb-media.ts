'use client';

import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

export interface UploadedKbMedia {
  url: string;
  key: string;
  size: number;
  mimeType: string;
  name: string;
}

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

export async function uploadKbMedia(file: File): Promise<UploadedKbMedia> {
  const error = getValidationError(file);
  if (error) {
    toast.error(error);
    throw new Error(error);
  }
  const fd = new FormData();
  fd.append('file', file);
  return apiClient.upload<UploadedKbMedia>('/kb/media', fd);
}
