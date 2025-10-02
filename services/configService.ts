import type { LanguageCode, LanguageProfile } from '../types.ts';

const LANGUAGE_PROFILE_KEY = 'appLanguageProfile';
const LANGUAGE_PROFILE_META_KEY = 'appLanguageProfileMeta';

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

export interface LanguageProfileMeta {
    uiLocked: boolean;
    lastDetected?: LanguageCode;
}

const defaultMeta: LanguageProfileMeta = {
    uiLocked: false,
    lastDetected: defaultProfile.ui,
};

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

export const getLanguageProfileMeta = (): LanguageProfileMeta => {
    try {
        const storedMeta = localStorage.getItem(LANGUAGE_PROFILE_META_KEY);
        if (storedMeta) {
            const parsed = JSON.parse(storedMeta) as Partial<LanguageProfileMeta>;
            return { ...defaultMeta, ...parsed };
        }
    } catch (e) {
        console.error('Failed to load language profile metadata:', e);
        localStorage.removeItem(LANGUAGE_PROFILE_META_KEY);
    }
    return { ...defaultMeta };
};

export const saveLanguageProfileMeta = (meta: LanguageProfileMeta): void => {
    try {
        localStorage.setItem(LANGUAGE_PROFILE_META_KEY, JSON.stringify(meta));
    } catch (e) {
        console.error('Failed to save language profile metadata:', e);
    }
};
