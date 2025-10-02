import React, { createContext, useCallback, useEffect, useMemo, useState, ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, { DEFAULT_LANG, SUPPORTED_LANGS } from '../i18n/config.ts';
import * as configService from '../../services/configService.ts';
import type { LanguageProfile } from '../../types.ts';

interface LanguageContextType {
  profile: LanguageProfile;
  setProfile: (profile: LanguageProfile) => void;
  currentLanguage: string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<LanguageProfile>(configService.getLanguageProfile());
  const [currentLanguage, setCurrentLanguage] = useState<string>(i18n.language || DEFAULT_LANG);

  useEffect(() => {
    const targetLang = SUPPORTED_LANGS.includes(profile.ui) ? profile.ui : DEFAULT_LANG;

    if (i18n.language !== targetLang) {
      i18n
        .changeLanguage(targetLang)
        .catch((changeError) => {
          console.error('Failed to change language', changeError);
        });
    }
  }, [profile.ui]);

  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      setCurrentLanguage(lng);
    };
    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  const setProfile = useCallback((newProfile: LanguageProfile) => {
    configService.saveLanguageProfile(newProfile);
    setProfileState(newProfile);
  }, []);

  const value = useMemo(
    () => ({
      profile,
      setProfile,
      currentLanguage,
    }),
    [profile, setProfile, currentLanguage]
  );

  return (
    <LanguageContext.Provider value={value}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </LanguageContext.Provider>
  );
};
