import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as configService from '../../services/configService.ts';
import { loadTranslations, TranslationKey } from '../services/languageService.ts';
import { LanguageProfile, LanguageCode } from '../../types.ts';

interface LanguageContextType {
  profile: LanguageProfile;
  setProfile: (profile: LanguageProfile) => void;
  t: (key: TranslationKey, fallback?: string) => string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<LanguageProfile>(configService.getLanguageProfile());
  const [translations, setTranslations] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchTranslations = async () => {
      const loaded = await loadTranslations(profile.ui);
      setTranslations(loaded);
    };
    fetchTranslations();
  }, [profile.ui]);

  const setProfile = (newProfile: LanguageProfile) => {
    configService.saveLanguageProfile(newProfile);
    setProfileState(newProfile);
  };

  const t = useCallback((key: TranslationKey, fallback?: string): string => {
    return translations[key] || fallback || key;
  }, [translations]);

  return (
    <LanguageContext.Provider value={{ profile, setProfile, t }}>
      {children}
    </LanguageContext.Provider>
  );
};