import type { AiService } from './aiService';
import { geminiService } from './geminiService';
import type { Phrase, LanguageProfile } from '../types';
import { currentLanguageProfile } from './currentLanguageProfile';

/**
 * Language-aware AI service wrapper
 * Ensures the AI service always has access to the current language profile
 *
 * Usage:
 * 1. Call setLanguageProfile() when the profile changes (from App.tsx or LanguageContext)
 * 2. Use this service instead of geminiService directly
 */

class LanguageAwareAiService {
    private baseService: AiService;

    constructor(baseService: AiService) {
        this.baseService = baseService;
    }

    /**
     * Set the current language profile
     * This should be called whenever the user's language profile changes
     */
    public setLanguageProfile(profile: LanguageProfile): void {
        currentLanguageProfile.setProfile(profile);
    }

    /**
     * Get the current language profile
     */
    public getLanguageProfile(): LanguageProfile {
        return currentLanguageProfile.getProfile();
    }

    /**
     * Delegate all AiService methods to the base service
     * The base service (geminiService) will use currentLanguageProfile internally
     */
    public get service(): AiService {
        return this.baseService;
    }
}

// Create and export singleton instance
export const languageAwareAiService = new LanguageAwareAiService(geminiService);

// Export convenience function
export function setCurrentLanguageProfile(profile: LanguageProfile): void {
    languageAwareAiService.setLanguageProfile(profile);
}

// Export the service for use in components
export const aiService = languageAwareAiService.service;
