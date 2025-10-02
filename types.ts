// FIX: Moved View type from App.tsx and exported it to be shared across components.
export type View = 'practice' | 'list' | 'library' | 'reader';

export const SUPPORTED_LANGUAGE_CODES = ['en', 'de', 'ru', 'fr', 'es', 'it', 'pt', 'pl', 'zh', 'ja', 'ar'] as const;
export type LanguageCode = typeof SUPPORTED_LANGUAGE_CODES[number];

export interface LanguageProfile {
  ui: LanguageCode;
  native: LanguageCode;
  learning: LanguageCode;
}

export type PhraseCategory = string;

export interface Category {
  id: string;
  name: string;
  color: string;
  isFoundational: boolean;
  isNew?: boolean; // Used to trigger auto-generation
}

export interface Phrase {
  id: string;
  text: {
    native: string;
    learning: string;
  };
  category: PhraseCategory;
  romanization?: {
    learning?: string;
  };
  context?: {
    native?: string;
  };
  masteryLevel: number; // 0: new, higher is better
  lastReviewedAt: number | null; // timestamp
  nextReviewAt: number; // timestamp
  knowCount: number; // Total times 'know' was clicked
  knowStreak: number; // Consecutive times 'know' was clicked
  isMastered: boolean; // True if knowCount >= 3 or knowStreak >= 2
  lapses: number; // Number of times the user has forgotten this card after the first success.
  isNew?: boolean;
}

export type ProposedCard = {
  native: string;
  learning: string;
};

export interface MovieExample {
  title: string;
  // FIX: Renamed 'titleNative' to be consistent with other types.
  titleNative: string;
  // FIX: Renamed 'dialogueLearning' to be consistent with other types.
  dialogueLearning: string;
  // FIX: Renamed 'dialogueNative' to be consistent with other types.
  dialogueNative: string;
}

export interface WordAnalysis {
  word: string;
  partOfSpeech: string;
  nativeTranslation: string;
  baseForm?: string; // Base form for adjectives
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
  exampleSentenceNative: string;
}

export interface PronounConjugation {
    pronoun: string;
    learning: string;
    native: string;
}

export interface TenseForms {
    statement: PronounConjugation[];
    question: PronounConjugation[];
    negative: PronounConjugation[];
}

export interface VerbConjugation {
  infinitive: string;
  past: TenseForms;
  present: TenseForms;
  future: TenseForms;
}

export interface NounDeclension {
  noun: string;
  singular: {
    nominativ: string;
    akkusativ: string;
    dativ: string;
    genitiv: string;
  };
  plural: {
    nominativ: string;
    akkusativ: string;
    dativ: string;
    genitiv: string;
  };
}

export interface AdjectiveDeclensionTable {
    masculine: { nominativ: string; akkusativ: string; dativ: string; genitiv: string; };
    feminine: { nominativ: string; akkusativ: string; dativ: string; genitiv: string; };
    neuter: { nominativ: string; akkusativ: string; dativ: string; genitiv: string; };
    plural: { nominativ: string; akkusativ: string; dativ: string; genitiv: string; };
}

export interface AdjectiveComparison {
    positive: string;
    comparative: string;
    superlative: string;
}

export interface AdjectiveDeclension {
    adjective: string;
    comparison: AdjectiveComparison;
    weak: AdjectiveDeclensionTable;
    mixed: AdjectiveDeclensionTable;
    strong: AdjectiveDeclensionTable;
}


export interface SentenceContinuation {
  learning: string;
  continuations: string[];
}


export interface ExamplePair {
  learning: string;
  native: string;
}

export interface ProactiveSuggestion {
  title: string;
  contentParts: ContentPart[];
}

export interface ContentPart {
  // FIX: Changed 'learning' to 'german' to match API response schema
  type: 'text' | 'german';
  text: string;
  translation?: string;
}

export interface CheatSheetOption {
  type: 'verbConjugation' | 'nounDeclension' | 'pronouns' | 'wFragen';
  label: string; // e.g., "Спряжение: sprechen"
  data: string; // e.g., 'sprechen' or a JSON string like '{"noun":"Tisch","article":"der"}'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text?: string;
  examples?: ExamplePair[];
  suggestions?: ProactiveSuggestion[];
  contentParts?: ContentPart[];
  promptSuggestions?: string[];
  isCorrect?: boolean;
  wordOptions?: string[];
  cheatSheetOptions?: CheatSheetOption[];
  // For Category Assistant
  assistantResponse?: CategoryAssistantResponse;
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
  readonly resultIndex: number;
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


// Types for translation editing flow
export interface TranslationChatRequest {
    // FIX: Renamed to use 'native'/'learning' for consistency.
    originalNative: string;
    // FIX: Renamed to use 'native'/'learning' for consistency.
    currentLearning: string;
    history: ChatMessage[];
    userRequest: string;
}

export interface TranslationChatResponse {
    role: 'model';
    contentParts: ContentPart[];
    suggestion?: {
        native: string;
        learning: string;
    };
    promptSuggestions: string[];
}

// Types for Phrase Builder
export interface PhraseBuilderOptions {
  words: string[];
}

export interface PhraseEvaluation {
  isCorrect: boolean;
  feedback: string;
  correctedPhrase?: string;
}

// EPUB Reader types
export interface Book {
  id?: number; // Optional because it's auto-incrementing
  title: string;
  author: string;
  coverBlob: Blob;
  epubData: ArrayBuffer;
  lastLocation: string | null;
}

export interface BookRecord extends Book {
  id: number;
  coverUrl: string; // Blob URL created on retrieval
}

// Types for Category Assistant
export interface CategoryAssistantResponse {
  responseType: 'text' | 'proposed_cards' | 'phrases_to_review' | 'phrases_to_delete';
  responseParts: ContentPart[];
  promptSuggestions: string[];
  proposedCards?: ProposedCard[];
  phrasesToReview?: { learning: string; reason: string }[];
  phrasesForDeletion?: { learning: string; reason: string }[];
}

export type CategoryAssistantRequestType = 'initial' | 'add_similar' | 'check_homogeneity' | 'create_dialogue' | 'user_text';

export interface CategoryAssistantRequest {
    type: CategoryAssistantRequestType;
    text?: string;
}