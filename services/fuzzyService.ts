/**
 * Calculates the Levenshtein distance between two strings.
 * This is a measure of the difference between two sequences.
 * @param a The first string.
 * @param b The second string.
 * @returns The Levenshtein distance.
 */
const levenshteinDistance = (a: string, b: string): number => {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix = Array(bn + 1);
  for (let i = 0; i <= bn; ++i) {
    matrix[i] = Array(an + 1);
  }

  for (let i = 0; i <= an; ++i) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= bn; ++j) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= bn; ++j) {
    for (let i = 1; i <= an; ++i) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }

  return matrix[bn][an];
};

/**
 * Checks if a new phrase is too similar to any existing phrases using Levenshtein distance.
 * Normalizes the strings by converting to lowercase and removing punctuation.
 * @param newPhrase The new phrase to check.
 * @param existingPhrases An array of existing phrases to compare against.
 * @param threshold The similarity threshold (0 to 1). A higher value means a stricter check. 0.8 means 80% similar.
 * @returns True if a similar phrase is found, false otherwise.
 */
export const isSimilar = (newPhrase: string, existingPhrases: string[], threshold: number = 0.8): boolean => {
  const normalize = (str: string) => str.toLowerCase().replace(/[.,!?]/g, '').trim();
  const normalizedNew = normalize(newPhrase);

  for (const existing of existingPhrases) {
    const normalizedExisting = normalize(existing);
    
    const maxLength = Math.max(normalizedNew.length, normalizedExisting.length);
    if (maxLength === 0) continue; // Both are empty, not similar in a meaningful way

    const distance = levenshteinDistance(normalizedNew, normalizedExisting);
    const similarity = 1 - distance / maxLength;
    
    if (similarity >= threshold) {
      console.log(`Fuzzy match found: "${newPhrase}" is ${similarity.toFixed(2)} similar to "${existing}"`);
      return true;
    }
  }

  return false;
};