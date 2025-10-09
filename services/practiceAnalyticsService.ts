import { Category, Phrase, PracticeReviewLogEntry } from '../types';
import { MAX_MASTERY_LEVEL, LEECH_THRESHOLD } from './srsService';

const MS_IN_DAY = 24 * 60 * 60 * 1000;

export interface PracticeAnalyticsSummary {
  totals: {
    totalCards: number;
    mastered: number;
    learning: number;
    newCards: number;
    masteryProgressPercent: number;
    dueToday: number;
    overdue: number;
    dueNext7Days: number;
  };
  accuracy: {
    overall: number | null;
    last7Days: number | null;
    last30Days: number | null;
    totalReviews: number;
    streakDays: number;
  };
  categories: Array<{
    id: string;
    name: string;
    total: number;
    mastered: number;
    inProgress: number;
    accuracy: number | null;
    avgMasteryLevel: number;
    isFoundational: boolean;
  }>;
  levels: Array<{
    level: number;
    count: number;
  }>;
  recentActivity: Array<{
    date: string;
    total: number;
    correct: number;
    incorrect: number;
  }>;
  newCardsByDay: Array<{
    date: string;
    count: number;
  }>;
  leeches: Array<{
    phraseId: string;
    learning: string;
    native: string;
    lapses: number;
    categoryId: string;
  }>;
}

const toDayKey = (timestamp: number): string => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
};

const calcAccuracy = (entries: PracticeReviewLogEntry[]): number | null => {
  if (!entries.length) return null;
  const correct = entries.filter(entry => entry.wasCorrect).length;
  return entries.length ? (correct / entries.length) * 100 : null;
};

const calcStreak = (activityMap: Map<string, number>, now: number): number => {
  let streak = 0;
  let cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);

  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!activityMap.get(key)) {
      break;
    }
    streak += 1;
    cursor = new Date(cursor.getTime() - MS_IN_DAY);
  }
  return streak;
};

export const buildPracticeAnalyticsSummary = (
  phrases: Phrase[],
  categories: Category[],
  reviewLog: PracticeReviewLogEntry[],
  now: number = Date.now(),
): PracticeAnalyticsSummary => {
  const totalCards = phrases.length;
  const mastered = phrases.filter(p => p.isMastered).length;
  const newCards = phrases.filter(p => p.lastReviewedAt === null).length;
  const learning = totalCards - mastered - newCards;

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday.getTime() + MS_IN_DAY - 1);

  const dueToday = phrases.filter(p => p.nextReviewAt <= endOfToday.getTime()).length;
  const overdue = phrases.filter(p => p.nextReviewAt < startOfToday.getTime()).length;
  const dueNext7Days = phrases.filter(p => p.nextReviewAt > endOfToday.getTime() && p.nextReviewAt <= endOfToday.getTime() + 6 * MS_IN_DAY).length;

  const masteryProgressPercent = totalCards
    ? Math.round((mastered / totalCards) * 100)
    : 0;

  const activityByDay = new Map<string, { total: number; correct: number; incorrect: number; newCards: number }>();
  reviewLog.forEach(entry => {
    const key = toDayKey(entry.timestamp);
    if (!activityByDay.has(key)) {
      activityByDay.set(key, { total: 0, correct: 0, incorrect: 0, newCards: 0 });
    }
    const dayStats = activityByDay.get(key)!;
    dayStats.total += 1;
    if (entry.wasCorrect) {
      dayStats.correct += 1;
    } else {
      dayStats.incorrect += 1;
    }
    if (entry.wasNew) {
      dayStats.newCards += 1;
    }
  });

  const last7Threshold = now - 6 * MS_IN_DAY;
  const last30Threshold = now - 29 * MS_IN_DAY;
  const last7Entries = reviewLog.filter(entry => entry.timestamp >= last7Threshold);
  const last30Entries = reviewLog.filter(entry => entry.timestamp >= last30Threshold);

  const totalReviews = reviewLog.length;
  const overallAccuracy = calcAccuracy(reviewLog);
  const last7Accuracy = calcAccuracy(last7Entries);
  const last30Accuracy = calcAccuracy(last30Entries);
  const streakDays = calcStreak(activityByDay, now);

  const categoryNameById = new Map(categories.map(cat => [cat.id, cat.name]));
  const categoryFoundational = new Map(categories.map(cat => [cat.id, cat.isFoundational]));

  const categoryStats = new Map<string, {
    total: number;
    mastered: number;
    inProgress: number;
    masterySum: number;
    logEntries: PracticeReviewLogEntry[];
  }>();

  phrases.forEach(phrase => {
    if (!categoryStats.has(phrase.category)) {
      categoryStats.set(phrase.category, {
        total: 0,
        mastered: 0,
        inProgress: 0,
        masterySum: 0,
        logEntries: [],
      });
    }
    const stats = categoryStats.get(phrase.category)!;
    stats.total += 1;
    stats.masterySum += phrase.masteryLevel;
    if (phrase.isMastered) {
      stats.mastered += 1;
    } else if (phrase.lastReviewedAt !== null) {
      stats.inProgress += 1;
    }
  });

  reviewLog.forEach(entry => {
    if (!categoryStats.has(entry.categoryId)) {
      categoryStats.set(entry.categoryId, {
        total: 0,
        mastered: 0,
        inProgress: 0,
        masterySum: 0,
        logEntries: [],
      });
    }
    const stats = categoryStats.get(entry.categoryId)!;
    stats.logEntries.push(entry);
  });

  const categorySummary = Array.from(categoryStats.entries()).map(([categoryId, stats]) => {
    const avgMasteryLevel = stats.total ? stats.masterySum / stats.total : 0;
    const accuracy = calcAccuracy(stats.logEntries);
    return {
      id: categoryId,
      name: categoryNameById.get(categoryId) ?? categoryId,
      total: stats.total,
      mastered: stats.mastered,
      inProgress: stats.inProgress,
      accuracy,
      avgMasteryLevel,
      isFoundational: categoryFoundational.get(categoryId) ?? false,
    };
  }).sort((a, b) => b.total - a.total);

  const maxLevelObserved = Math.max(MAX_MASTERY_LEVEL, ...phrases.map(p => p.masteryLevel));
  const levels: Array<{ level: number; count: number }> = [];
  for (let level = 0; level <= maxLevelObserved; level++) {
    const count = phrases.filter(phrase => phrase.masteryLevel === level).length;
    levels.push({ level, count });
  }

  const recentActivity = Array.from(activityByDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({
      date,
      total: stats.total,
      correct: stats.correct,
      incorrect: stats.incorrect,
    }));

  const newCardsByDay = Array.from(activityByDay.entries())
    .filter(([, stats]) => stats.newCards > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({
      date,
      count: stats.newCards,
    }));

  const leeches = phrases
    .filter(phrase => (phrase.lapses ?? 0) >= LEECH_THRESHOLD)
    .sort((a, b) => (b.lapses ?? 0) - (a.lapses ?? 0))
    .slice(0, 20)
    .map(phrase => ({
      phraseId: phrase.id,
      learning: phrase.text.learning,
      native: phrase.text.native,
      lapses: phrase.lapses ?? 0,
      categoryId: phrase.category,
    }));

  return {
    totals: {
      totalCards,
      mastered,
      learning,
      newCards,
      masteryProgressPercent,
      dueToday,
      overdue,
      dueNext7Days,
    },
    accuracy: {
      overall: overallAccuracy,
      last7Days: last7Accuracy,
      last30Days: last30Accuracy,
      totalReviews,
      streakDays,
    },
    categories: categorySummary,
    levels,
    recentActivity,
    newCardsByDay,
    leeches,
  };
};
