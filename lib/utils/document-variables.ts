/**
 * Substitutes `{{Variable_Name}}` tokens in an HTML template with provided values.
 * Returns the substituted result and a list of any tokens that had no corresponding value.
 */
export function substituteVariables(
  htmlContent: string,
  variables: Record<string, string>
): { result: string; missing: string[] } {
  const tokenRegex = /\{\{([^}]+)\}\}/g;
  const missing: string[] = [];
  const result = htmlContent.replace(tokenRegex, (_match, key: string) => {
    const trimmed = key.trim();
    const val = variables[trimmed];
    if (!val) {
      missing.push(trimmed);
      return _match;
    }
    return val;
  });
  return { result, missing };
}

/**
 * Extracts all unique `{{Variable_Name}}` token names from an HTML template.
 */
export function extractVariables(htmlContent: string): string[] {
  const tokenRegex = /\{\{([^}]+)\}\}/g;
  const vars: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(htmlContent)) !== null) {
    const trimmed = m[1].trim();
    if (!vars.includes(trimmed)) vars.push(trimmed);
  }
  return vars;
}
