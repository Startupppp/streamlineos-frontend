/**
 * Trigger a browser download of a Blob under the given filename.
 * Centralizes the object-URL lifecycle (create → click → revoke) so callers
 * don't hand-roll the anchor dance.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
