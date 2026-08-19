/** Normalize model-authored MD/MDX before it reaches Astro's content loader. */
export function normalizeGeneratedContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed.startsWith("---")) throw new Error("Generated content is missing YAML frontmatter");

  return trimmed.replace(/^updatedDate:\s*(.+)$/m, (_line, raw: string) => {
    const value = raw.trim().replace(/^['"]|['"]$/g, "");
    const parsed = new Date(value);
    if (Number.isNaN(parsed.valueOf())) throw new Error(`Invalid generated updatedDate: ${raw}`);
    return `updatedDate: ${JSON.stringify(parsed.toISOString())}`;
  }) + "\n";
}
