export const MAX_COLUMN_NAME = 50;

export function validateRename(
  name: string,
  currentName: string,
  existingNames: string[],
): string | null {
  if (!name) return "Name is required";
  if (!/[a-zA-Z0-9]/.test(name)) return "Name must contain at least one letter or number";
  if (name.length > MAX_COLUMN_NAME) return `Name must be ${MAX_COLUMN_NAME} characters or fewer`;
  if (name.toLowerCase() === currentName.toLowerCase()) return null;
  if (existingNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
    return "A column with this name already exists";
  }
  return null;
}
