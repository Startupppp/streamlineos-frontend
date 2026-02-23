import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Resolves a stored image value to a displayable URL.
 * - null/undefined/empty → undefined (shows fallback)
 * - Starts with http:// or https:// → external URL, use as-is
 * - Starts with / → local path, use as-is
 * - Anything else → storage key, proxy through /api/storage/image
 */
export function resolveImageUrl(image: string | null | undefined): string | undefined {
  if (!image) return undefined;
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  if (image.startsWith("/")) return image;
  return `/api/storage/image?key=${encodeURIComponent(image)}`;
}

/**
 * Generates a URL-friendly slug from a string
 * Converts to lowercase, removes special characters, replaces spaces with hyphens
 * 
 * @param text - The text to convert to a slug
 * @returns A valid slug matching pattern /^[a-z0-9-]+$/
 * 
 * @example
 * generateSlug("Acme Corporation") // "acme-corporation"
 * generateSlug("My Company & Co.") // "my-company-co"
 * generateSlug("Tech Solutions 2024!") // "tech-solutions-2024"
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-") // Replace any non-alphanumeric with hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}
