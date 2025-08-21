import { Phrase } from '../types';

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

export const isPhraseMastered = (phrase: Phrase): boolean => {
  // Mastered if known 3 times total OR 2 times in a row.
  return phrase.knowCount >= 3 || phrase.knowStreak >= 2;
};

export const selectNextPhrase = (phrases: Phrase[], currentPhraseId: string | null = null): Phrase | null => {
  const unmasteredPhrases = phrases.filter(p => !p.isMastered);
  if (unmasteredPhrases.length === 0) return null;
  
  // Filter out the current phrase to avoid immediate repetition, unless it's the only one available.
  const availablePhrasesPool = unmasteredPhrases.length > 1 && currentPhraseId
    ? unmasteredPhrases.filter(p => p.id !== currentPhraseId)
    : unmasteredPhrases;

  if (availablePhrasesPool.length === 0) {
      // This can happen if only one unmastered phrase remains
      return unmasteredPhrases[0];
  }

  const now = Date.now();
  
  const dueForReview = availablePhrasesPool.filter(p => p.nextReviewAt <= now);
  
  if (dueForReview.length > 0) {
    // Return the one with the lowest mastery level among those due
    return dueForReview.sort((a, b) => a.masteryLevel - b.masteryLevel)[0];
  }

  // If nothing is due for review, check for completely new phrases that haven't been reviewed at all
  const newPhrases = availablePhrasesPool.filter(p => p.lastReviewedAt === null);
  if (newPhrases.length > 0) {
    return newPhrases[0];
  }

  // If all cards have been reviewed and nothing is due, return the one that is due next (soonest)
  return availablePhrasesPool.sort((a, b) => a.nextReviewAt - b.nextReviewAt)[0];
};

type UserAction = 'know' | 'forgot' | 'dont_know';

export const updatePhraseMastery = (phrase: Phrase, action: UserAction): Phrase => {
  const now = Date.now();
  let newMasteryLevel = phrase.masteryLevel;
  let newKnowCount = phrase.knowCount;
  let newKnowStreak = phrase.knowStreak;

  switch (action) {
    case 'know':
      newMasteryLevel = Math.min(MAX_MASTERY_LEVEL, phrase.masteryLevel + 1);
      newKnowCount++;
      newKnowStreak++;
      break;
    case 'forgot':
      newMasteryLevel = Math.max(0, phrase.masteryLevel - 2);
      newKnowStreak = 0; // Reset streak
      break;
    case 'dont_know':
      newMasteryLevel = Math.max(0, phrase.masteryLevel - 1);
      newKnowStreak = 0; // Reset streak
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
  };

  return {
      ...updatedPhrasePartial,
      isMastered: isPhraseMastered(updatedPhrasePartial)
  };
};