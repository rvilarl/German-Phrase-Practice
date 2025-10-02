import { useContext } from 'react';
import { useTranslation as useI18nextTranslation } from 'react-i18next';
import { LanguageContext } from '../contexts/languageContext.tsx';

export const useTranslation = () => {
  const languageContext = useContext(LanguageContext);
  if (languageContext === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }

  const translation = useI18nextTranslation();

  return {
    ...translation,
    profile: languageContext.profile,
    setProfile: languageContext.setProfile,
    currentLanguage: languageContext.currentLanguage,
    isLocalizing: languageContext.isLocalizing,
    localizationPhase: languageContext.localizationPhase,
    localizationLanguage: languageContext.localizationLanguage,
  };
};
