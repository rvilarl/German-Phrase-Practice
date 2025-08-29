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

const pronouns = [
  // Nominativ
  { russian: "я", german: "ich" },
  { russian: "ты", german: "du" },
  { russian: "он", german: "er" },
  { russian: "она", german: "sie" },
  { russian: "оно", german: "es" },
  { russian: "мы", german: "wir" },
  { russian: "вы (неформ.)", german: "ihr" },
  { russian: "они", german: "sie" },
  { russian: "Вы (форм.)", german: "Sie" },
  // Akkusativ
  { russian: "меня (Akk)", german: "mich" },
  { russian: "тебя (Akk)", german: "dich" },
  { russian: "его (Akk)", german: "ihn" },
  // Dativ
  { russian: "мне (Dat)", german: "mir" },
  { russian: "тебе (Dat)", german: "dir" },
  { russian: "ему (Dat)", german: "ihm" },
  { russian: "им (Dat)", german: "ihnen" },
  { russian: "Вам (Dat)", german: "Ihnen" },
  // Possessiv
  { russian: "мой", german: "mein" },
  { russian: "твой", german: "dein" },
  { russian: "его (притяж.)", german: "sein" },
  { russian: "её", german: "ihr" },
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

const numbers = [
    { russian: "ноль", german: "null" },
    { russian: "один", german: "eins" },
    { russian: "два", german: "zwei" },
    { russian: "три", german: "drei" },
    { russian: "четыре", german: "vier" },
    { russian: "пять", german: "fünf" },
    { russian: "шесть", german: "sechs" },
    { russian: "семь", german: "sieben" },
    { russian: "восемь", german: "acht" },
    { russian: "девять", german: "neun" },
    { russian: "десять", german: "zehn" },
    { russian: "одиннадцать", german: "elf" },
    { russian: "двенадцать", german: "zwölf" },
    { russian: "двадцать", german: "zwanzig" },
    { russian: "сто", german: "hundert" },
];

const timePhrases = [
    // Days
    { russian: "Понедельник", german: "Montag" },
    { russian: "Вторник", german: "Dienstag" },
    { russian: "Среда", german: "Mittwoch" },
    { russian: "Четверг", german: "Donnerstag" },
    { russian: "Пятница", german: "Freitag" },
    { russian: "Суббота", german: "Samstag" },
    { russian: "Воскресенье", german: "Sonntag" },
    // Months
    { russian: "Январь", german: "Januar" },
    { russian: "Февраль", german: "Februar" },
    { russian: "Март", german: "März" },
    { russian: "Апрель", german: "April" },
    { russian: "Май", german: "Mai" },
    { russian: "Июнь", german: "Juni" },
    { russian: "Июль", german: "Juli" },
    { russian: "Август", german: "August" },
    { russian: "Сентябрь", german: "September" },
    { russian: "Октябрь", german: "Oktober" },
    { russian: "Ноябрь", german: "November" },
    { russian: "Декабрь", german: "Dezember" },
    // Conversational Time
    { russian: "Который час?", german: "Wie spät ist es?" },
    { russian: "Сейчас час.", german: "Es ist ein Uhr." },
    { russian: "Сейчас два часа.", german: "Es ist zwei Uhr." },
    { russian: "Пол первого.", german: "Es ist halb eins." }, // 12:30
    { russian: "Полтретьего.", german: "Es ist halb drei." }, // 2:30
    { russian: "Четверть пятого.", german: "Es ist Viertel nach vier." }, // 4:15
    { russian: "Без четверти шесть.", german: "Es ist Viertel vor sechs." }, // 5:45
    { russian: "Десять минут седьмого.", german: "Es ist zehn nach sechs." }, // 6:10
    { russian: "Без двадцати девять.", german: "Es ist zwanzig vor neun." }, // 8:40
    { russian: "Пять минут после полудня.", german: "Es ist fünf nach zwölf." }, // 12:05
];

const moneyPhrases = [
    { russian: "Сколько это стоит?", german: "Was kostet das?" },
    { russian: "Это стоит 10 евро.", german: "Das kostet zehn Euro." },
    { russian: "23,75 евро", german: "dreiundzwanzig Euro fünfundsiebzig" },
    { russian: "12,50 долларов", german: "zwölf Dollar fünfzig" },
    { russian: "У вас есть сдача с 50 евро?", german: "Haben Sie Wechselgeld für fünfzig Euro?" },
    { russian: "Я хотел бы заплатить.", german: "Ich möchte bezahlen." }
];

export const initialPhrases: Omit<Phrase, 'id'>[] = [
  ...basicPhrases.map(p => ({ ...p, category: 'general' as const })),
  ...pronouns.map(p => ({ ...p, category: 'pronouns' as const })),
  ...wFragen.map(p => ({ ...p, category: 'w-fragen' as const })),
  ...numbers.map(p => ({ ...p, category: 'numbers' as const })),
  ...timePhrases.map(p => ({ ...p, category: 'time' as const })),
  ...moneyPhrases.map(p => ({ ...p, category: 'money' as const })),
].map(p => ({
    ...p,
    masteryLevel: 0,
    lastReviewedAt: null,
    nextReviewAt: now,
    knowCount: 0,
    knowStreak: 0,
    isMastered: false,
}));