import { LanguageProfile } from '../types';

const LANGUAGE_PROFILE_KEY = 'appLanguageProfile';

const defaultProfile: LanguageProfile = {
    ui: 'ru',
    native: 'ru',
    learning: 'de',
};

export const getLanguageProfile = (): LanguageProfile => {
    try {
        const storedProfile = localStorage.getItem(LANGUAGE_PROFILE_KEY);
        if (storedProfile) {
            return JSON.parse(storedProfile);
        }
    } catch (e) {
        console.error("Failed to load language profile:", e);
    }
    return defaultProfile;
};

export const saveLanguageProfile = (profile: LanguageProfile): void => {
    try {
        localStorage.setItem(LANGUAGE_PROFILE_KEY, JSON.stringify(profile));
    } catch (e) {
        console.error("Failed to save language profile:", e);
    }
};