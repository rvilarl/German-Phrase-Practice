import { Phrase } from '../types';

const now = Date.now();

export const initialPhrases = [
  { russian: "Привет", german: "Hallo", hint: "Hallo" },
  { russian: "Спасибо", german: "Danke", hint: "Danke" },
  { russian: "Пожалуйста", german: "Bitte", hint: "Bitte" },
  { russian: "Да", german: "Ja", hint: "Ja" },
  { russian: "Нет", german: "Nein", hint: "Nein" },
  { russian: "Как дела?", german: "Wie geht's?", hint: "geht's" },
  { russian: "Хорошо, спасибо", german: "Gut, danke", hint: "Gut, danke" },
  { russian: "Меня зовут...", german: "Ich heiße...", hint: "heiße" },
  { russian: "До свидания", german: "Auf Wiedersehen", hint: "Auf Wiedersehen" },
  { russian: "Прошу прощения", german: "Entschuldigung", hint: "Entschuldigung" }
].map(p => ({
    ...p,
    masteryLevel: 0,
    lastReviewedAt: null,
    nextReviewAt: now,
    knowCount: 0,
    knowStreak: 0,
    isMastered: false,
}));