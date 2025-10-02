const CACHE_KEYS = [
  'germanPhrases',
  'germanAppSettings',
  'germanAppCategories',
  'germanAppButtonUsage',
  'germanAppMasteryButtonUsage',
  'germanAppHabitTracker',
  'germanAppCardActionUsage',
  'germanAppPracticeChatHistory'
];

export const clearAppCaches = (): void => {
  try {
    CACHE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error('Не удалось очистить кеш приложения', error);
  }
};
