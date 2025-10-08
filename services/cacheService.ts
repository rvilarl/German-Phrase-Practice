import { ChatMessage, LanguageCode } from '../types';
import { currentLanguageProfile } from './currentLanguageProfile';

/**
 * Retrieves and parses a JSON value from localStorage.
 * @param key The key to retrieve.
 * @returns The parsed value, or null if not found or parsing fails.
 */
export const getCache = <T>(key: string): T | null => {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return null;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error reading from cache for key "${key}":`, error);
    // In case of an error (e.g., corrupted data), it's good to clear the invalid item.
    localStorage.removeItem(key);
    return null;
  }
};

/**
 * Stringifies and saves a value to localStorage.
 * @param key The key to save under.
 * @param value The value to save.
 */
export const setCache = (key: string, value: unknown): void => {
  try {
    const item = JSON.stringify(value);
    localStorage.setItem(key, item);
  } catch (error) {
    console.error(`Error writing to cache for key "${key}":`, error);
  }
};


/**
 * Get language pair prefix for cache keys
 * Format: {native}_{learning}_
 * Example: "ru_de_"
 */
export const getLanguagePairPrefix = (): string => {
  const profile = currentLanguageProfile.getProfile();
  return `${profile.native}_${profile.learning}_`;
};

/**
 * Create a language-aware cache key
 * @param baseKey The base key without language prefix
 * @returns Language-aware cache key
 */
export const createLanguageAwareKey = (baseKey: string): string => {
  return getLanguagePairPrefix() + baseKey;
};

/**
 * Get language-aware cache
 * @param baseKey The base key without language prefix
 * @returns The parsed value, or null if not found
 */
export const getLanguageAwareCache = <T>(baseKey: string): T | null => {
  return getCache<T>(createLanguageAwareKey(baseKey));
};

/**
 * Set language-aware cache
 * @param baseKey The base key without language prefix
 * @param value The value to save
 */
export const setLanguageAwareCache = (baseKey: string, value: unknown): void => {
  setCache(createLanguageAwareKey(baseKey), value);
};

/**
 * Clears all cache entries associated with a specific phrase ID.
 * @param phraseId The ID of the phrase to clear cache for.
 */
export const clearCacheForPhrase = (phraseId: string): void => {
  const prefixes = [
    `deep_dive_${phraseId}`,
    `movie_examples_${phraseId}`,
    `word_analysis_${phraseId}_`,
    `phrase_builder_${phraseId}`,
    `chat_initial_${phraseId}`,
    `quick_reply_options_${phraseId}`,
    `sentence_chain_api_cache_${phraseId}`,
    `sentence_chain_history_${phraseId}`
  ];

  const keysToRemove: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && prefixes.some(prefix => key.startsWith(prefix))) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    if (keysToRemove.length > 0) {
      console.log(`Cleared ${keysToRemove.length} cache entries for mastered phrase ${phraseId}.`);
    }
  } catch (error) {
    console.error(`Error clearing cache for phrase ${phraseId}:`, error);
  }
};

/**
 * Clear all cache entries for a specific language pair
 * @param native Native language code
 * @param learning Learning language code
 */
export const clearLanguagePairCache = (native: LanguageCode, learning: LanguageCode): void => {
  const prefix = `${native}_${learning}_`;
  const keysToRemove: string[] = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    if (keysToRemove.length > 0) {
      console.log(`Cleared ${keysToRemove.length} cache entries for ${native}→${learning} language pair.`);
    }
  } catch (error) {
    console.error(`Error clearing cache for language pair ${native}→${learning}:`, error);
  }
};
