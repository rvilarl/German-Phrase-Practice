export interface Phrase {
  id: string;
  russian: string;
  german: string;
  masteryLevel: number; // 0: new, higher is better
  lastReviewedAt: number | null; // timestamp
  nextReviewAt: number; // timestamp
  knowCount: number; // Total times 'know' was clicked
  knowStreak: number; // Consecutive times 'know' was clicked
  isMastered: boolean; // True if knowCount >= 3 or knowStreak >= 2
}

export interface MovieExample {
  title: string;
  titleRussian: string;
  dialogue: string;
  dialogueRussian: string;
}

export interface WordAnalysis {
  word: string;
  partOfSpeech: string;
  translation: string;
  nounDetails?: {
    article: string;
    plural: string;
  };
  verbDetails?: {
    infinitive: string;
    tense: string;
    person: string;
  };
  exampleSentence: string;
  exampleSentenceTranslation: string;
}

export interface ExamplePair {
  german: string;
  russian: string;
}

export interface ProactiveSuggestion {
  title: string;
  contentParts: ContentPart[];
}

export interface ContentPart {
  type: 'text' | 'german';
  text: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text?: string;
  examples?: ExamplePair[];
  suggestions?: ProactiveSuggestion[];
  contentParts?: ContentPart[];
  promptSuggestions?: string[];
}

export interface DeepDiveAnalysis {
  chunks: {
    text: string;
    type: string;
    explanation: string;
  }[];
  keyConcepts: {
    concept: string;
    explanation: string;
  }[];
  personalizationQuestion: string;
  mnemonicImage: {
    description: string;
    keywords: string[];
  };
}


// --- Web Speech API Types for TypeScript ---

export interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

export interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

export interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

export interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: { new (): SpeechRecognition };
    webkitSpeechRecognition: { new (): SpeechRecognition };
  }
}

// This is to allow using `SpeechRecognition` as a type.
declare var SpeechRecognition: {
  new (): SpeechRecognition;
};
