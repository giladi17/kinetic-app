export function stripEmoji(text) {
  // Remove emoji-like pictographs (and variation selectors) while keeping normal punctuation.
  return String(text ?? "")
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

