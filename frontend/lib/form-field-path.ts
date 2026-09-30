export function isFormFieldPath<TValues extends Record<string, unknown>>(
  values: TValues,
  path: string,
): path is Extract<keyof TValues, string> {
  return Object.prototype.hasOwnProperty.call(values, path);
}
