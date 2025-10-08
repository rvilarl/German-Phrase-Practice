import type { LanguageProfile, LanguageCode } from '../types';

/**
 * Global language profile storage for AI services
 * This allows AI services to access the current language profile without prop drilling
 */
class CurrentLanguageProfileService {
  private profile: LanguageProfile = {
    ui: 'en',
    native: 'ru',
    learning: 'de',
  };

  /**
   * Set the current language profile
   * Should be called from App.tsx or LanguageContext when profile changes
   */
  public setProfile(profile: LanguageProfile): void {
    this.profile = { ...profile };
    console.log('[CurrentLanguageProfile] Updated to:', this.profile);
  }

  /**
   * Get the current language profile
   */
  public getProfile(): LanguageProfile {
    return { ...this.profile };
  }

  /**
   * Get native language code
   */
  public getNative(): LanguageCode {
    return this.profile.native;
  }

  /**
   * Get learning language code
   */
  public getLearning(): LanguageCode {
    return this.profile.learning;
  }

  /**
   * Get UI language code
   */
  public getUi(): LanguageCode {
    return this.profile.ui;
  }
}

// Export singleton instance
export const currentLanguageProfile = new CurrentLanguageProfileService();
