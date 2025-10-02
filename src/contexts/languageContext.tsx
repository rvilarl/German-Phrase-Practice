import React, { createContext, useCallback, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, { DEFAULT_LANG, SUPPORTED_LANGS } from '../i18n/config.ts';
import * as configService from '../../services/configService.ts';
import type { LanguageProfile, LanguageCode } from '../../types.ts';
import { hasLocaleGaps, loadLocaleResources } from '../services/languageService.ts';
import LocalizationOverlay from '../../components/LocalizationOverlay.tsx';
import DevLanguageSelector from '../../components/DevLanguageSelector.tsx';
import type { LocalizationPhase } from '../i18n/localizationPhases.ts';
import { getLanguageLabel } from '../i18n/languageMeta.ts';

const DEV_OVERRIDE_KEY = 'devLanguageOverride';

interface LanguageContextType {
  profile: LanguageProfile;
  setProfile: (profile: LanguageProfile) => void;
  currentLanguage: string;
  isLocalizing: boolean;
  localizationPhase: LocalizationPhase;
  localizationLanguage: LanguageCode;
  isDev: boolean;
  openDevLanguageSelector?: () => void;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const detectBrowserLanguage = (): LanguageCode => {
  if (typeof navigator === 'undefined' || !navigator.language) {
    return DEFAULT_LANG as LanguageCode;
  }
  const base = navigator.language.split('-')[0].toLowerCase();
  return (SUPPORTED_LANGS.includes(base as LanguageCode) ? base : DEFAULT_LANG) as LanguageCode;
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const isDev = import.meta.env.DEV;
  const [profile, setProfileState] = useState<LanguageProfile>(() => {
    const initialProfile = configService.getLanguageProfile();
    if (isDev) {
      const override = localStorage.getItem(DEV_OVERRIDE_KEY) as LanguageCode | null;
      if (override && SUPPORTED_LANGS.includes(override)) {
        return { ...initialProfile, ui: override };
      }
    }
    return initialProfile;
  });

  const [currentLanguage, setCurrentLanguage] = useState<string>(i18n.language || DEFAULT_LANG);
  const [localizationPhase, setLocalizationPhase] = useState<LocalizationPhase>('idle');
  const [isLocalizing, setIsLocalizing] = useState<boolean>(false);
  const [localizationLanguage, setLocalizationLanguage] = useState<LanguageCode>(profile.ui as LanguageCode);
  const [overlayVisible, setOverlayVisible] = useState<boolean>(false);
  const [showDevSelector, setShowDevSelector] = useState<boolean>(() => isDev && !localStorage.getItem(DEV_OVERRIDE_KEY));

  const activeController = useRef<AbortController | null>(null);
  const hideOverlayTimeout = useRef<number | null>(null);

  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      setCurrentLanguage(lng);
    };
    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  useEffect(() => {
    if (!isDev) {
      return;
    }
    const override = localStorage.getItem(DEV_OVERRIDE_KEY) as LanguageCode | null;
    if (override && override !== profile.ui && SUPPORTED_LANGS.includes(override)) {
      setProfileState((prev) => ({ ...prev, ui: override }));
      configService.saveLanguageProfile({ ...profile, ui: override });
    }
  }, []);

  useEffect(() => {
    const targetLang = (SUPPORTED_LANGS.includes(profile.ui) ? profile.ui : DEFAULT_LANG) as LanguageCode;
    setLocalizationLanguage(targetLang);

    if (hideOverlayTimeout.current !== null) {
      window.clearTimeout(hideOverlayTimeout.current);
      hideOverlayTimeout.current = null;
    }
    if (activeController.current) {
      activeController.current.abort();
    }

    if (isDev && showDevSelector) {
      setOverlayVisible(false);
      setIsLocalizing(false);
      setLocalizationPhase('idle');
      return;
    }

    const controller = new AbortController();
    activeController.current = controller;

    const needsLocalizationOverlay = hasLocaleGaps(targetLang);
    if (needsLocalizationOverlay) {
      setOverlayVisible(true);
      setIsLocalizing(true);
      setLocalizationPhase('checkingStatic');
    }

    let finalPhase: LocalizationPhase = 'completed';

    loadLocaleResources(targetLang, {
      signal: controller.signal,
      onPhase: (phase) => {
        if (controller.signal.aborted) {
          return;
        }
        setLocalizationPhase(phase);
      },
    })
      .then(async (result) => {
        if (controller.signal.aborted) {
          return;
        }
        if (!i18n.hasResourceBundle(result.lang, 'translation')) {
          i18n.addResourceBundle(result.lang, 'translation', result.resources, true, true);
        } else if (result.source !== 'static') {
          i18n.addResourceBundle(result.lang, 'translation', result.resources, true, true);
        }
        await i18n.changeLanguage(result.lang);
        finalPhase = 'completed';
        setLocalizationPhase('completed');
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }
        console.error('Failed to localize UI', error);
        finalPhase = 'fallback';
        setLocalizationPhase('fallback');
        i18n.changeLanguage(DEFAULT_LANG).catch((changeError) => {
          console.error('Failed to revert to default language', changeError);
        });
      })
      .finally(() => {
        if (controller.signal.aborted) {
          return;
        }
        if (needsLocalizationOverlay) {
          const delay = finalPhase === 'fallback' ? 1800 : 600;
          hideOverlayTimeout.current = window.setTimeout(() => {
            setOverlayVisible(false);
            setIsLocalizing(false);
            hideOverlayTimeout.current = null;
          }, delay);
        } else {
          setIsLocalizing(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [profile.ui, isDev, showDevSelector]);

  const setProfile = useCallback((newProfile: LanguageProfile) => {
    configService.saveLanguageProfile(newProfile);
    setProfileState(newProfile);
  }, []);

  const handleDevLanguageSelect = useCallback((lang: LanguageCode) => {
    if (!isDev) {
      return;
    }
    localStorage.setItem(DEV_OVERRIDE_KEY, lang);
    setShowDevSelector(false);
    setProfile((prev) => ({ ...prev, ui: lang }));
  }, [isDev, setProfile]);

  const handleUseSystemLanguage = useCallback(() => {
    if (!isDev) {
      return;
    }
    localStorage.removeItem(DEV_OVERRIDE_KEY);
    const detected = detectBrowserLanguage();
    setShowDevSelector(false);
    setProfile((prev) => ({ ...prev, ui: detected }));
  }, [isDev, setProfile]);

  const openDevLanguageSelector = useCallback(() => {
    if (isDev) {
      setShowDevSelector(true);
    }
  }, [isDev]);

  const value = useMemo(
    () => ({
      profile,
      setProfile,
      currentLanguage,
      isLocalizing,
      localizationPhase,
      localizationLanguage,
      isDev,
      openDevLanguageSelector: isDev ? openDevLanguageSelector : undefined,
    }),
    [profile, setProfile, currentLanguage, isLocalizing, localizationPhase, localizationLanguage, isDev, openDevLanguageSelector]
  );

  return (
    <LanguageContext.Provider value={value}>
      <I18nextProvider i18n={i18n}>
        {children}
        <LocalizationOverlay
          visible={overlayVisible}
          phase={localizationPhase}
          languageCode={localizationLanguage}
        />
        {isDev && (
          <DevLanguageSelector
            visible={showDevSelector}
            selectedLanguage={profile.ui as LanguageCode}
            onSelect={handleDevLanguageSelect}
            onUseSystem={handleUseSystemLanguage}
          />
        )}
      </I18nextProvider>
    </LanguageContext.Provider>
  );
};
