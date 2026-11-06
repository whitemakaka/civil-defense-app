export function formatNoteText(lines: string[]): string {
  return lines.map(line => `• ${line}`).join('\n');
}
