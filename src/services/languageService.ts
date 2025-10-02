import { LanguageCode } from '../../types.ts';

// We can't statically derive keys from a fetched JSON, so we use a generic string.
// This is a tradeoff for browser compatibility without a complex build step.
export type TranslationKey = string;

// A minimal, hardcoded fallback in case fetching translations fails completely.
const enTranslationsFallback = {
    "header.title": "Lingopo",
    "header.subtitle": "Spaced Repetition System"
};

export const loadTranslations = async (lang: LanguageCode): Promise<Record<string, string>> => {
    // We only have 'ru' and 'en', so we default to 'en' for any other language code.
    const langToLoad = (lang === 'ru') ? lang : 'en';
    
    try {
        const response = await fetch(`/src/i18n/${langToLoad}.json`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Could not load translations for '${langToLoad}', falling back to built-in English.`, error);
        // On any error, we return the hardcoded fallback to ensure the app remains usable.
        return enTranslationsFallback;
    }
};