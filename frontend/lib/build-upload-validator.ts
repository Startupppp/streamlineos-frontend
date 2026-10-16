export function validatePreUpload(
  file: File,
  isAllowedType: (file: File) => boolean,
  acceptedTypesLabel?: string,
): string | null {
  if (file.size === 0) return `${file.name} is empty`;
  if (!isAllowedType(file)) {
    return acceptedTypesLabel
      ? `${file.name} is not an accepted file type. Accepted: ${acceptedTypesLabel}.`
      : `${file.name} is not an allowed file type.`;
  }
  return null;
}
