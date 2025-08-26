import { Phrase } from '../types';
import { isInitialPhrase } from '../data/initialPhrases';

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
  // New rule: Initial phrases are mastered after being known once.
  if (isInitialPhrase(phrase)) {
    return phrase.knowCount >= 1;
  }
  
  // Existing rule for generated phrases.
  // Mastered if known 3 times total OR 2 times in a row, or mastery level is max
  return phrase.masteryLevel >= MAX_MASTERY_LEVEL || phrase.knowCount >= 3 || phrase.knowStreak >= 2;
};

const russianPronouns = [
    "я", "ты", "он", "она", "оно", "мы", "вы (неформ.)", "они", "вы (форм.)"
];


// Helper to categorize phrases
export const getPhraseCategory = (phrase: Phrase): string | null => {
    if (!phrase) return null;
    const russian = phrase.russian.trim().toLowerCase();
    const german = phrase.german.trim().toLowerCase();

    // List of W-Fragen from initial data
    const wFragenList = [
        "was?", "wer?", "wo?", "wann?", "wie?", "warum?", "woher?", "wohin?",
        "welcher?", "wie viel?", "wie viele?"
    ];

    if (wFragenList.includes(german)) {
        return 'w-frage';
    }

    if (russianPronouns.includes(russian)) {
        return 'personal-pronoun';
    }

    // New logic for short phrases
    const wordCount = german.split(' ').filter(word => word.length > 0).length;
    if (wordCount > 0 && wordCount <= 2) {
        return 'short-phrase';
    }
    
    return 'regular';
};


export const selectNextPhrase = (phrases: Phrase[], currentPhraseId: string | null = null): Phrase | null => {
  // Guard against empty or invalid input
  if (!phrases || phrases.length === 0) {
    return null;
  }
  
  // Filter for phrases that are not null and not mastered
  const unmasteredPhrases = phrases.filter(p => p && !p.isMastered);
  if (unmasteredPhrases.length === 0) return null;
  
  // If there's only one unmastered phrase, return it.
  if (unmasteredPhrases.length === 1) {
    return unmasteredPhrases[0];
  }

  const poolWithoutCurrent = unmasteredPhrases.filter(p => p.id !== currentPhraseId);
  if (poolWithoutCurrent.length === 0) {
      // This happens if there's only one unmastered phrase left, and it's the current one.
      // In this case, we can just return it again.
      return unmasteredPhrases[0];
  }
  
  // Split phrases into special (W-Fragen, pronouns) and regular pools
  const specialPhrases = poolWithoutCurrent.filter(p => {
    const category = getPhraseCategory(p);
    return category === 'w-frage' || category === 'personal-pronoun';
  });

  const regularPhrases = poolWithoutCurrent.filter(p => {
    const category = getPhraseCategory(p);
    return category !== 'w-frage' && category !== 'personal-pronoun';
  });

  let chosenPool: Phrase[];
  const random = Math.random();

  // 70% chance for regular, 30% for special, with fallbacks if a pool is empty
  if (random < 0.7) {
    chosenPool = regularPhrases.length > 0 ? regularPhrases : specialPhrases;
  } else {
    chosenPool = specialPhrases.length > 0 ? specialPhrases : regularPhrases;
  }
  
  // If for some reason both pools were empty but poolWithoutCurrent was not, fallback
  if (chosenPool.length === 0) {
      chosenPool = poolWithoutCurrent;
  }

  // Now, apply priority logic within the chosen pool.
  const now = Date.now();
  
  // Priority 1: Phrases due for review (must have been reviewed before)
  const dueForReview = chosenPool.filter(p => p.lastReviewedAt !== null && p.nextReviewAt <= now);
  if (dueForReview.length > 0) {
    // Prioritize the one with the lowest mastery level
    return dueForReview.sort((a, b) => a.masteryLevel - b.masteryLevel)[0];
  }

  // Priority 2: Completely new phrases
  const newPhrases = chosenPool.filter(p => p.lastReviewedAt === null);
  if (newPhrases.length > 0) {
    // Pick a random new phrase to avoid always showing them in the same order
    return newPhrases[Math.floor(Math.random() * newPhrases.length)];
  }

  // Priority 3: If nothing is due and no new cards, pick the one scheduled soonest
  const upcomingPhrases = chosenPool.filter(p => p.lastReviewedAt !== null);
  if (upcomingPhrases.length > 0) {
    return upcomingPhrases.sort((a, b) => a.nextReviewAt - b.nextReviewAt)[0];
  }

  // Fallback: should not be reached if there are unmastered phrases, but as a safeguard.
  return chosenPool.length > 0 ? chosenPool[Math.floor(Math.random() * chosenPool.length)] : null;
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
