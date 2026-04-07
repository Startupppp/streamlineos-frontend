import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
