import { useState, useEffect } from 'react';
import * as backendService from '../../services/backendService';
import type { LanguageCode } from '../../types';

interface UseLanguageOnboardingResult {
  needsOnboarding: boolean;
  isLoading: boolean;
  isGeneratingData: boolean;
  detectedLanguage: LanguageCode;
  completeOnboarding: (native: LanguageCode, learning: LanguageCode) => Promise<void>;
}

const DEV_OVERRIDE_KEY = 'devLanguageOverride';

const detectBrowserLanguage = (): LanguageCode => {
  // In DEV mode, check if DevLanguageSelector has set an override
  if (import.meta.env.DEV) {
    const devOverride = localStorage.getItem(DEV_OVERRIDE_KEY);
    if (devOverride) {
      return devOverride as LanguageCode;
    }
  }

  // Otherwise use browser language
  if (typeof navigator === 'undefined' || !navigator.language) {
    return 'en';
  }
  const base = navigator.language.split('-')[0].toLowerCase();
  const SUPPORTED_LANGS = ['en', 'de', 'ru', 'fr', 'es', 'it', 'pt', 'pl', 'zh', 'ja', 'ar', 'hi'];
  return (SUPPORTED_LANGS.includes(base) ? base : 'en') as LanguageCode;
};

export const useLanguageOnboarding = (userId: string | null): UseLanguageOnboardingResult => {
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingData, setIsGeneratingData] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<LanguageCode>(detectBrowserLanguage());

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      setNeedsOnboarding(false);
      return;
    }

    const checkProfile = async () => {
      // Re-check detected language at the start (for DEV mode updates)
      setDetectedLanguage(detectBrowserLanguage());
      try {
        setIsLoading(true);

        // Try to get existing profile from backend
        const profile = await backendService.getUserProfile();

        // If profile is null, user is brand new - needs onboarding
        if (!profile) {
          console.log('No profile found - new user needs onboarding');
          setNeedsOnboarding(true);
          setIsLoading(false);
          return;
        }

        // Check if user has any data
        const initialData = await backendService.fetchInitialData();
        const hasData = initialData.categories.length > 0;

        // User needs onboarding if they have no data
        if (!hasData) {
          console.log('No data found - user needs onboarding');
          setNeedsOnboarding(true);
        } else {
          console.log('User has profile and data - no onboarding needed');
          setNeedsOnboarding(false);
        }
      } catch (error) {
        console.error('Error checking user profile:', error);
        // If there's an error, assume user needs onboarding
        setNeedsOnboarding(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkProfile();
  }, [userId]); // detectedLanguage updated inside, not a dependency

  const completeOnboarding = async (native: LanguageCode, learning: LanguageCode) => {
    if (!userId) return;

    try {
      setIsGeneratingData(true);

      // Save profile to backend
      await backendService.updateUserProfile({
        ui: native, // Use native language for UI
        native,
        learning,
      });

      // Load initial data for this language pair - this may take a while
      console.log('Starting initial data generation...');
      await backendService.loadInitialData();
      console.log('Initial data generation completed!');

      setNeedsOnboarding(false);
      setIsGeneratingData(false);

      // Reload the page to reinitialize with new language profile
      window.location.reload();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setIsGeneratingData(false);
      throw error;
    }
  };

  return {
    needsOnboarding,
    isLoading,
    isGeneratingData,
    detectedLanguage,
    completeOnboarding,
  };
};
