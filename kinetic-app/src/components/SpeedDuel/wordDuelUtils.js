import englishWords from "an-array-of-english-words";
import WORD_DUEL_NAMES from "../../data/wordDuelNames";

const DICTIONARY = new Set(englishWords.map((w) => w.toUpperCase()));

export function isValidWord(word) {
  return DICTIONARY.has(word.toUpperCase());
}

export function countLetterDifferences(wordA, wordB) {
  if (wordA.length !== wordB.length) return -1;
  let diffs = 0;
  for (let i = 0; i < wordA.length; i++) {
    if (wordA[i] !== wordB[i]) diffs++;
  }
  return diffs;
}

export function validateMove(previousWord, newWord) {
  const prev = previousWord.toUpperCase();
  const next = newWord.toUpperCase();

  if (next.length !== prev.length) {
    return { valid: false, reason: `Must be ${prev.length} letters long` };
  }

  const diffs = countLetterDifferences(prev, next);
  if (diffs === 0) {
    return { valid: false, reason: "You must change exactly ONE letter" };
  }
  if (diffs > 1) {
    return { valid: false, reason: `Changed ${diffs} letters — only ONE allowed` };
  }

  if (!isValidWord(next)) {
    return { valid: false, reason: `"${next}" is not a valid English word` };
  }

  return { valid: true, reason: null };
}

export function getRandomStarter(excludeNames = []) {
  const pool = WORD_DUEL_NAMES.filter((n) => !excludeNames.includes(n.celebrity));
  const entry = pool.length > 0
    ? pool[Math.floor(Math.random() * pool.length)]
    : WORD_DUEL_NAMES[Math.floor(Math.random() * WORD_DUEL_NAMES.length)];
  return entry;
}

export { WORD_DUEL_NAMES };

export function generateAIMove(currentWord, usedWords) {
  const word = currentWord.toUpperCase();
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  const candidates = [];
  for (let i = 0; i < word.length; i++) {
    for (const ch of alphabet) {
      if (ch === word[i]) continue;
      const chars = word.split("");
      chars[i] = ch;
      const candidate = chars.join("");
      if (isValidWord(candidate) && !usedWords.has(candidate)) {
        candidates.push(candidate);
      }
    }
  }

  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
