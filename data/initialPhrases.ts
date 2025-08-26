import { Phrase } from '../types';

const now = Date.now();

const basicPhrases = [
  { russian: "Привет", german: "Hallo" },
  { russian: "Спасибо", german: "Danke" },
  { russian: "Пожалуйста", german: "Bitte" },
  { russian: "Да", german: "Ja" },
  { russian: "Нет", german: "Nein" },
  { russian: "Как дела?", german: "Wie geht's?" },
  { russian: "Хорошо, спасибо", german: "Gut, danke" },
  { russian: "Меня зовут...", german: "Ich heiße..." },
  { russian: "До свидания", german: "Auf Wiedersehen" },
  { russian: "Прошу прощения", german: "Entschuldigung" }
];

const personalPronouns = [
  { russian: "я", german: "ich" },
  { russian: "ты", german: "du" },
  { russian: "он", german: "er" },
  { russian: "она", german: "sie" },
  { russian: "оно", german: "es" },
  { russian: "мы", german: "wir" },
  { russian: "вы (неформ.)", german: "ihr" },
  { russian: "они", german: "sie" },
  { russian: "Вы (форм.)", german: "Sie" },
];

const wFragen = [
  { russian: "Что?", german: "Was?" },
  { russian: "Кто?", german: "Wer?" },
  { russian: "Где?", german: "Wo?" },
  { russian: "Когда?", german: "Wann?" },
  { russian: "Как?", german: "Wie?" },
  { russian: "Почему?", german: "Warum?" },
  { russian: "Откуда?", german: "Woher?" },
  { russian: "Куда?", german: "Wohin?" },
  { russian: "Какой?", german: "Welcher?" },
  { russian: "Сколько? (неисчисл.)", german: "Wie viel?" },
  { russian: "Сколько? (исчисл.)", german: "Wie viele?" }
];

// Combine all initial phrases for easy lookup
const allInitialGermanPhrases = new Set([
  ...basicPhrases.map(p => p.german),
  ...personalPronouns.map(p => p.german),
  ...wFragen.map(p => p.german)
]);

/**
 * Checks if a phrase is one of the initial, hardcoded phrases.
 * @param phrase The phrase to check.
 * @returns True if it's an initial phrase, false otherwise.
 */
export const isInitialPhrase = (phrase: Phrase): boolean => {
  return allInitialGermanPhrases.has(phrase.german);
};


export const initialPhrases = [
  ...basicPhrases,
  ...personalPronouns,
  ...wFragen
].map(p => ({
    ...p,
    masteryLevel: 0,
    lastReviewedAt: null,
    nextReviewAt: now,
    knowCount: 0,
    knowStreak: 0,
    isMastered: false,
}));
