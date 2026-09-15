/**
 * Render a reminder template by replacing {key} placeholders with values.
 */
export function renderReminder(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return vars[key] ?? match;
  });
}
