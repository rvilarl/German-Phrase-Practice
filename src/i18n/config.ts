import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { SUPPORTED_LANGUAGE_CODES } from '../../types.ts';

export const SUPPORTED_LANGS = [...SUPPORTED_LANGUAGE_CODES];
export const DEFAULT_LANG = 'en';
export const LOCALE_SCHEMA_VERSION = 1;

const localeModules = import.meta.glob<{ default: Record<string, unknown> }>('./*.json', { eager: true });

export type LocaleResources = Record<string, { translation: Record<string, unknown> }>;

const resources = Object.entries(localeModules).reduce<LocaleResources>(
  (acc, [path, module]) => {
    const match = path.match(/\.\/(.+?)\.json$/);
    if (!match) {
      return acc;
    }
    const lang = match[1];
    acc[lang] = { translation: module.default };
    return acc;
  },
  {}
);

export const STATIC_RESOURCES: LocaleResources = resources;

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: DEFAULT_LANG,
      supportedLngs: SUPPORTED_LANGS,
      defaultNS: 'translation',
      interpolation: {
        escapeValue: false,
      },
      returnEmptyString: false,
      load: 'currentOnly',
    })
    .catch((initError) => {
      console.error('Failed to initialize i18next', initError);
    });
}

export default i18n;
