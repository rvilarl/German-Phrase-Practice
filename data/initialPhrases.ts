import { Phrase } from '../types';

const now = Date.now();

export const initialPhrases = [
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
].map(p => ({
    ...p,
    masteryLevel: 0,
    lastReviewedAt: null,
    nextReviewAt: now,
    knowCount: 0,
    knowStreak: 0,
    isMastered: false,
}));