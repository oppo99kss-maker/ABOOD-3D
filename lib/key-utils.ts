export function parseRawKeyList(input: string | string[]): string[] {
  const items = Array.isArray(input) ? input : [input];
  const keys: string[] = [];
  for (const item of items) {
    if (!item) continue;
    // Split by newlines, carriage returns, commas, semicolons, tabs, and pipes
    const lines = item.split(/[\r\n,;\t|]+/);
    for (const line of lines) {
      let trimmed = line.trim();
      if (!trimmed) continue;
      // Strip outer quotes, brackets, and parenthesis
      trimmed = trimmed.replace(/^["'`“‘\[\(\{<]+|["'`”’\]\)\}>]+$/g, "").trim();
      // Strip leading numbering or bullet prefixes (e.g., "1. ", "1) ", "1- ", "• ")
      trimmed = trimmed.replace(/^(\d+[\.\)\-]\s+|[\*\•]\s*)/, "").trim();
      // Strip common label prefixes like "كود:", "مفتاح:", "الرمز:", "key:", "code:", "license:" (only with colon or equals)
      trimmed = trimmed.replace(/^(كود|مفتاح|الرمز|رمز|key|code|license|lic)\s*[:：=]\s*/i, "").trim();
      // Collapse inner whitespace
      trimmed = trimmed.replace(/\s+/g, " ");
      if (trimmed.length >= 2) {
        keys.push(trimmed);
      }
    }
  }
  return keys;
}
