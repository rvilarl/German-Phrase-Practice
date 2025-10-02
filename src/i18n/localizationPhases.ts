export const LOCALIZATION_STEPS = ['checkingStatic', 'loadingCache', 'requestingAI', 'validating', 'applying'] as const;
export type LocalizationStep = typeof LOCALIZATION_STEPS[number];
export type LocalizationPhase = LocalizationStep | 'idle' | 'completed' | 'fallback';
