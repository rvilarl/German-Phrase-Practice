import { DEFAULT_LANG, LOCALE_SCHEMA_VERSION, STATIC_RESOURCES, SUPPORTED_LANGS } from '../i18n/config.ts';
import type { LanguageCode } from '../../types.ts';
import { translateLocaleTemplate } from '../../services/geminiService.ts';
import { readLocaleCache, writeLocaleCache } from './localeCache.ts';
import { LOCALIZATION_STEPS, type LocalizationPhase } from '../i18n/localizationPhases.ts';

export type TranslationKey = string;
export type TranslationRecord = Record<string, unknown>;

const PLACEHOLDER_REGEX = /{{\s*([\w.-]+)\s*}}/g;

const baseTemplate: TranslationRecord = STATIC_RESOURCES[DEFAULT_LANG]?.translation ?? {};

const collectEntries = (source: TranslationRecord, prefix = ''): Map<string, unknown> => {
  const entries = new Map<string, unknown>();

  Object.entries(source).forEach(([key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      collectEntries(value as TranslationRecord, nextKey).forEach((nestedValue, nestedKey) => {
        entries.set(nestedKey, nestedValue);
      });
    } else {
      entries.set(nextKey, value);
    }
  });

  return entries;
};

const baseEntries = collectEntries(baseTemplate);

const extractPlaceholders = (value: string): string[] => {
  const matches = value.matchAll(PLACEHOLDER_REGEX);
  const placeholders = new Set<string>();
  for (const match of matches) {
    placeholders.add(match[1]);
  }
  return Array.from(placeholders).sort();
};

const placeholdersMatch = (baseValue: unknown, candidateValue: unknown): boolean => {
  if (typeof baseValue !== 'string') {
    return true;
  }
  const basePlaceholders = extractPlaceholders(baseValue);
  if (basePlaceholders.length === 0) {
    return true;
  }
  if (typeof candidateValue !== 'string') {
    return false;
  }
  const candidatePlaceholders = extractPlaceholders(candidateValue);
  if (candidatePlaceholders.length !== basePlaceholders.length) {
    return false;
  }
  return basePlaceholders.every((placeholder, index) => candidatePlaceholders[index] === placeholder);
};

export interface LocaleAssessment {
  missingKeys: string[];
  emptyKeys: string[];
  placeholderMismatches: string[];
}

export const assessLocale = (candidate: TranslationRecord): LocaleAssessment => {
  const candidateEntries = collectEntries(candidate);

  const missingKeys: string[] = [];
  const emptyKeys: string[] = [];
  const placeholderMismatches: string[] = [];

  baseEntries.forEach((baseValue, key) => {
    if (!candidateEntries.has(key)) {
      missingKeys.push(key);
      return;
    }

    const candidateValue = candidateEntries.get(key);

    if (typeof baseValue === 'string') {
      if (typeof candidateValue !== 'string' || candidateValue.trim().length === 0) {
        emptyKeys.push(key);
        return;
      }
      if (!placeholdersMatch(baseValue, candidateValue)) {
        placeholderMismatches.push(key);
      }
    } else if (baseValue !== null && typeof baseValue === 'object') {
      if (candidateValue === null || typeof candidateValue !== 'object') {
        missingKeys.push(key);
      }
    }
  });

  return { missingKeys, emptyKeys, placeholderMismatches };
};

export const resolveLanguage = (lang: LanguageCode): string => (
  SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG
);

export const getStaticLocale = (lang: string): TranslationRecord => (
  STATIC_RESOURCES[lang]?.translation ?? {}
);

export const hasLocaleGaps = (lang: string): boolean => {
  const candidate = getStaticLocale(lang);
  const { missingKeys, emptyKeys, placeholderMismatches } = assessLocale(candidate);
  return missingKeys.length > 0 || emptyKeys.length > 0 || placeholderMismatches.length > 0;
};

export const validateLocaleShape = (candidate: TranslationRecord): boolean => {
  const { missingKeys, emptyKeys, placeholderMismatches } = assessLocale(candidate);
  return missingKeys.length === 0 && emptyKeys.length === 0 && placeholderMismatches.length === 0;
};

const generationPromises = new Map<string, Promise<TranslationRecord>>();

export type LocaleSource = 'static' | 'cache' | 'ai';

export interface LoadLocaleOptions {
  onPhase?: (phase: LocalizationPhase) => void;
  signal?: AbortSignal;
}

export interface LocaleLoadResult {
  lang: string;
  resources: TranslationRecord;
  source: LocaleSource;
}

const notify = (cb: LoadLocaleOptions['onPhase'], phase: LocalizationPhase) => {
  if (cb) {
    cb(phase);
  }
};

export const loadLocaleResources = async (lang: LanguageCode, options: LoadLocaleOptions = {}): Promise<LocaleLoadResult> => {
  const { onPhase, signal } = options;
  const resolvedLang = resolveLanguage(lang);

  console.log(`[Localization] Starting localization for language: ${resolvedLang}`);

  if (signal?.aborted) {
    throw new DOMException('Localization aborted', 'AbortError');
  }

  notify(onPhase, 'checkingStatic');
  const staticLocale = getStaticLocale(resolvedLang);
  const staticAssessment = assessLocale(staticLocale);
  console.log(`[Localization] Static locale assessment - Missing: ${staticAssessment.missingKeys.length}, Empty: ${staticAssessment.emptyKeys.length}, Placeholder mismatches: ${staticAssessment.placeholderMismatches.length}`);

  if (validateLocaleShape(staticLocale)) {
    console.log(`[Localization] Using static locale for ${resolvedLang}`);
    notify(onPhase, 'completed');
    return { lang: resolvedLang, resources: staticLocale, source: 'static' };
  }

  if (signal?.aborted) {
    throw new DOMException('Localization aborted', 'AbortError');
  }

  notify(onPhase, 'loadingCache');
  try {
    const cached = await readLocaleCache(resolvedLang, LOCALE_SCHEMA_VERSION);
    if (cached) {
      const cacheAssessment = assessLocale(cached);
      console.log(`[Localization] Cache assessment - Missing: ${cacheAssessment.missingKeys.length}, Empty: ${cacheAssessment.emptyKeys.length}, Placeholder mismatches: ${cacheAssessment.placeholderMismatches.length}`);

      if (validateLocaleShape(cached)) {
        console.log(`[Localization] Using cached locale for ${resolvedLang}`);
        notify(onPhase, 'completed');
        return { lang: resolvedLang, resources: cached, source: 'cache' };
      } else {
        console.warn(`[Localization] Cached locale for ${resolvedLang} is invalid, will try AI generation`);
      }
    } else {
      console.log(`[Localization] No cached locale found for ${resolvedLang}`);
    }
  } catch (cacheError) {
    console.warn(`[Localization] Failed to read locale cache for ${resolvedLang}:`, cacheError);
  }

  if (signal?.aborted) {
    throw new DOMException('Localization aborted', 'AbortError');
  }

  console.log(`[Localization] Starting AI generation for ${resolvedLang}`);
  notify(onPhase, 'requestingAI');
  let generationPromise = generationPromises.get(resolvedLang);
  if (!generationPromise) {
    generationPromise = (async () => {
      try {
        console.log(`[Localization] Calling translateLocaleTemplate for ${resolvedLang}`);
        const generated = await translateLocaleTemplate(baseTemplate, resolvedLang as LanguageCode);
        console.log(`[Localization] AI generation completed for ${resolvedLang}`);
        return generated;
      } catch (aiError) {
        console.error(`[Localization] AI generation failed for ${resolvedLang}:`, aiError);
        throw aiError;
      }
    })();
    generationPromises.set(resolvedLang, generationPromise);
  } else {
    console.log(`[Localization] Reusing existing AI generation promise for ${resolvedLang}`);
  }

  let generatedLocale: TranslationRecord;
  try {
    generatedLocale = await generationPromise;
  } catch (generationError) {
    console.error(`[Localization] AI generation promise failed for ${resolvedLang}:`, generationError);
    throw generationError;
  } finally {
    generationPromises.delete(resolvedLang);
  }

  if (signal?.aborted) {
    throw new DOMException('Localization aborted', 'AbortError');
  }

  notify(onPhase, 'validating');
  const assessment = assessLocale(generatedLocale);
  console.log(`[Localization] Generated locale assessment - Missing: ${assessment.missingKeys.length}, Empty: ${assessment.emptyKeys.length}, Placeholder mismatches: ${assessment.placeholderMismatches.length}`);

  if (assessment.missingKeys.length > 0 || assessment.emptyKeys.length > 0 || assessment.placeholderMismatches.length > 0) {
    console.error(`[Localization] Generated locale is invalid for ${resolvedLang}`);
    if (assessment.missingKeys.length > 0) {
      console.error(`[Localization] Missing keys (${assessment.missingKeys.length}):`, assessment.missingKeys.slice(0, 5));
    }
    if (assessment.emptyKeys.length > 0) {
      console.error(`[Localization] Empty keys (${assessment.emptyKeys.length}):`, assessment.emptyKeys.slice(0, 5));
    }
    if (assessment.placeholderMismatches.length > 0) {
      console.error(`[Localization] Placeholder mismatches (${assessment.placeholderMismatches.length}):`, assessment.placeholderMismatches.slice(0, 5));
    }
    throw new Error(`Generated locale is invalid. Missing: ${assessment.missingKeys.length}, Empty: ${assessment.emptyKeys.length}, Placeholder mismatches: ${assessment.placeholderMismatches.length}`);
  }

  console.log(`[Localization] Generated locale is valid for ${resolvedLang}`);
  notify(onPhase, 'applying');
  try {
    await writeLocaleCache(resolvedLang, LOCALE_SCHEMA_VERSION, generatedLocale);
    console.log(`[Localization] Successfully cached generated locale for ${resolvedLang}`);
  } catch (cacheError) {
    console.warn(`[Localization] Failed to write locale cache for ${resolvedLang}:`, cacheError);
  }

  notify(onPhase, 'completed');
  console.log(`[Localization] Localization completed successfully for ${resolvedLang}`);
  return { lang: resolvedLang, resources: generatedLocale, source: 'ai' };
};

export { LOCALIZATION_STEPS };
