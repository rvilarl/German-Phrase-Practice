import { Phrase, PhraseCategory } from '../types';

// Intervals in milliseconds
// e.g., 1 hour, 8 hours, 1 day, 3 days, 1 week, 2 weeks
const SRS_INTERVALS = [
  1 * 60 * 60 * 1000,
  8 * 60 * 60 * 1000,
  24 * 60 * 60 * 1000,
  3 * 24 * 60 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000,
  14 * 24 * 60 * 60 * 1000,
];

export const MAX_MASTERY_LEVEL = SRS_INTERVALS.length;
export const LEECH_THRESHOLD = 5;

export const isPhraseMastered = (phrase: Phrase): boolean => {
  // Foundational categories are mastered after being known once.
  const foundationalCategories: PhraseCategory[] = ['w-fragen', 'pronouns', 'numbers', 'time', 'money'];
  if (foundationalCategories.includes(phrase.category)) {
    return phrase.knowCount >= 1;
  }
  
  // New rule for general phrases: they are only mastered when they reach the max SRS level.
  return phrase.masteryLevel >= MAX_MASTERY_LEVEL;
};

const wFragenList = ["was", "wer", "wo", "wann", "wie", "warum", "woher", "wohin", "welcher", "wie viel", "wie viele"];
const pronounList = ["ich", "du", "er", "sie", "es", "wir", "ihr", "sie", "mich", "dich", "ihn", "mir", "dir", "ihm", "ihnen", "mein", "dein", "sein"];

/**
 * Assigns a category to a phrase that doesn't have one.
 * Used for migrating phrases from older versions stored in localStorage.
 */
export const assignInitialCategory = (phrase: Omit<Phrase, 'category' | 'id'>): PhraseCategory => {
    const german = phrase.german.toLowerCase().replace(/[?]/g, '').trim();
    if (wFragenList.includes(german)) return 'w-fragen';
    // Check against formal 'Sie' separately to avoid conflict with 'sie' (she/they)
    if (phrase.german.trim() === 'Sie') return 'pronouns';
    if (pronounList.includes(german)) return 'pronouns';
    return 'general';
};


// Helper to categorize phrases for UI or simple logic
export const getPhraseCategory = (phrase: Phrase): string | null => {
    if (!phrase) return null;
    return phrase.category;
};


export const selectNextPhrase = (phrases: Phrase[], currentPhraseId: string | null = null): Phrase | null => {
  // Guard against empty or invalid input
  if (!phrases || phrases.length === 0) {
    return null;
  }
  
  // If there's only one phrase in the pool, return it.
  if (phrases.length === 1) {
    return phrases[0];
  }

  const poolWithoutCurrent = phrases.filter(p => p.id !== currentPhraseId);
  if (poolWithoutCurrent.length === 0) {
      // This happens if there's only one phrase left, and it's the current one.
      return phrases[0];
  }

  const now = Date.now();
  
  // Priority 1: Phrases due for review (must have been reviewed before)
  const dueForReview = poolWithoutCurrent.filter(p => p.lastReviewedAt !== null && p.nextReviewAt <= now);
  if (dueForReview.length > 0) {
    // Prioritize the one with the lowest mastery level
    return dueForReview.sort((a, b) => a.masteryLevel - b.masteryLevel)[0];
  }

  // Priority 2: Completely new phrases
  const newPhrases = poolWithoutCurrent.filter(p => p.lastReviewedAt === null);
  if (newPhrases.length > 0) {
    // Pick a random new phrase to avoid always showing them in the same order
    return newPhrases[Math.floor(Math.random() * newPhrases.length)];
  }

  // Priority 3: If nothing is due and no new cards, pick the one scheduled soonest
  const upcomingPhrases = poolWithoutCurrent.filter(p => p.lastReviewedAt !== null);
  if (upcomingPhrases.length > 0) {
    return upcomingPhrases.sort((a, b) => a.nextReviewAt - b.nextReviewAt)[0];
  }

  // Fallback: should not be reached if there are unmastered phrases, but as a safeguard.
  return poolWithoutCurrent.length > 0 ? poolWithoutCurrent[Math.floor(Math.random() * poolWithoutCurrent.length)] : null;
};

type UserAction = 'know' | 'forgot' | 'dont_know';

export const isLeech = (phrase: Phrase): boolean => {
    return phrase.lapses >= LEECH_THRESHOLD;
}

export const updatePhraseMastery = (phrase: Phrase, action: UserAction): Phrase => {
  const now = Date.now();
  let newMasteryLevel = phrase.masteryLevel;
  let newKnowCount = phrase.knowCount;
  let newKnowStreak = phrase.knowStreak;
  let newLapses = phrase.lapses || 0;

  switch (action) {
    case 'know':
      newMasteryLevel = Math.min(MAX_MASTERY_LEVEL, phrase.masteryLevel + 1);
      newKnowCount++;
      newKnowStreak++;
      // A correct answer resets the lapse count.
      newLapses = 0;
      break;
    case 'forgot':
      newMasteryLevel = Math.max(0, phrase.masteryLevel - 2);
      newKnowStreak = 0; // Reset streak
      // Increment lapses only if the card was not new, which helps identify consistently forgotten cards.
      if (phrase.masteryLevel > 0) {
        newLapses++;
      }
      break;
    case 'dont_know':
      newMasteryLevel = Math.max(0, phrase.masteryLevel - 1);
      newKnowStreak = 0; // Reset streak
      // 'Don't know' on a new card shouldn't count as a lapse.
      if (phrase.masteryLevel > 0) {
        newLapses++;
      }
      break;
  }

  const interval = action === 'know' && newMasteryLevel > 0
    ? SRS_INTERVALS[Math.min(newMasteryLevel - 1, SRS_INTERVALS.length - 1)]
    : 5 * 60 * 1000; // 5 minutes for incorrect answers

  const updatedPhrasePartial = {
    ...phrase,
    masteryLevel: newMasteryLevel,
    lastReviewedAt: now,
    nextReviewAt: now + interval,
    knowCount: newKnowCount,
    knowStreak: newKnowStreak,
    lapses: newLapses,
  };

  return {
      ...updatedPhrasePartial,
      isMastered: isPhraseMastered(updatedPhrasePartial)
  };
};