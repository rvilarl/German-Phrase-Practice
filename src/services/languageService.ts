import { DEFAULT_LANG, STATIC_RESOURCES, SUPPORTED_LANGS } from '../i18n/config.ts';
import type { LanguageCode } from '../../types.ts';

export type TranslationKey = string;
export type TranslationRecord = Record<string, unknown>;

const baseTemplate: TranslationRecord = STATIC_RESOURCES[DEFAULT_LANG]?.translation ?? {};

export const resolveLanguage = (lang: LanguageCode): string => (
  SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG
);

export const getStaticLocale = (lang: string): TranslationRecord => (
  STATIC_RESOURCES[lang]?.translation ?? {}
);

const collectKeys = (source: TranslationRecord, prefix = ''): Map<string, unknown> => {
  const entries = new Map<string, unknown>();

  Object.entries(source).forEach(([key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      collectKeys(value as TranslationRecord, nextKey).forEach((nestedValue, nestedKey) => {
        entries.set(nestedKey, nestedValue);
      });
    } else {
      entries.set(nextKey, value);
    }
  });

  return entries;
};

const baseKeys = collectKeys(baseTemplate);

export interface LocaleDiff {
  missingKeys: string[];
  emptyKeys: string[];
}

export const diffLocaleAgainstBase = (candidate: TranslationRecord): LocaleDiff => {
  const candidateEntries = collectKeys(candidate);

  const missingKeys: string[] = [];
  const emptyKeys: string[] = [];

  baseKeys.forEach((_, key) => {
    if (!candidateEntries.has(key)) {
      missingKeys.push(key);
      return;
    }

    const value = candidateEntries.get(key);
    if (typeof value === 'string' && value.trim().length === 0) {
      emptyKeys.push(key);
    }
  });

  return { missingKeys, emptyKeys };
};

export const hasLocaleGaps = (lang: string): boolean => {
  const candidate = getStaticLocale(lang);
  const { missingKeys, emptyKeys } = diffLocaleAgainstBase(candidate);
  return missingKeys.length > 0 || emptyKeys.length > 0;
};

export const validateLocaleShape = (candidate: TranslationRecord): boolean => {
  const { missingKeys, emptyKeys } = diffLocaleAgainstBase(candidate);
  return missingKeys.length === 0 && emptyKeys.length === 0;
};
