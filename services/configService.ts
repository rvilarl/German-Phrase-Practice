import { LanguageProfile } from '../types.ts';

const LANGUAGE_PROFILE_KEY = 'appLanguageProfile';

const defaultProfile: LanguageProfile = {
    ui: 'ru',
    native: 'ru',
    learning: 'de',
};

export type LanguageProfileSource = 'storage' | 'default';

export interface LanguageProfileResult {
    profile: LanguageProfile;
    source: LanguageProfileSource;
}

export const getLanguageProfile = (): LanguageProfileResult => {
    try {
        const storedProfile = localStorage.getItem(LANGUAGE_PROFILE_KEY);
        if (storedProfile) {
            return { profile: JSON.parse(storedProfile), source: 'storage' };
        }
    } catch (e) {
        console.error('Failed to load language profile:', e);
        localStorage.removeItem(LANGUAGE_PROFILE_KEY);
    }
    return { profile: defaultProfile, source: 'default' };
};

export const saveLanguageProfile = (profile: LanguageProfile): void => {
    try {
        localStorage.setItem(LANGUAGE_PROFILE_KEY, JSON.stringify(profile));
    } catch (e) {
        console.error('Failed to save language profile:', e);
    }
};
