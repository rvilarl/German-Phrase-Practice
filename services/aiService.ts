import { Phrase, ChatMessage, DeepDiveAnalysis, MovieExample, WordAnalysis, VerbConjugation, NounDeclension, AdjectiveDeclension, SentenceContinuation, TranslationChatRequest, TranslationChatResponse, PhraseBuilderOptions, PhraseEvaluation, CategoryAssistantRequest, CategoryAssistantResponse } from '../types';

export interface AiService {
  generatePhrases(prompt: string): Promise<Omit<Phrase, 'id'>[]>;
  generateSinglePhrase(russianPhrase: string): Promise<{ german: string; russian: string; }>;
  translatePhrase(russianPhrase: string): Promise<{ german: string }>;
  translateGermanToRussian(germanPhrase: string): Promise<{ russian: string }>;
  getWordTranslation(russianPhrase: string, germanPhrase: string, russianWord: string): Promise<{ germanTranslation: string }>;
  improvePhrase(originalRussian: string, currentGerman: string): Promise<{ suggestedGerman: string; explanation: string }>;
  generateInitialExamples(phrase: Phrase): Promise<ChatMessage>;
  continueChat(phrase: Phrase, history: ChatMessage[], newMessage: string): Promise<ChatMessage>;
  practiceConversation(history: ChatMessage[], newMessage: string, allPhrases: Phrase[]): Promise<ChatMessage>;
  guideToTranslation(phrase: Phrase, history: ChatMessage[], userAnswer: string): Promise<ChatMessage>;
  discussTranslation(request: TranslationChatRequest): Promise<TranslationChatResponse>;
  generateDeepDiveAnalysis(phrase: Phrase): Promise<DeepDiveAnalysis>;
  generateMovieExamples(phrase: Phrase): Promise<MovieExample[]>;
  analyzeWordInPhrase(phrase: Phrase, word: string): Promise<WordAnalysis>;
  conjugateVerb(infinitive: string): Promise<VerbConjugation>;
  conjugateVerbSimple(infinitive: string): Promise<{ pronoun: string; form: string; }[]>;
  declineNoun(noun: string, article: string): Promise<NounDeclension>;
  declineAdjective(adjective: string): Promise<AdjectiveDeclension>;
  generateSentenceContinuations(russianPhrase: string): Promise<SentenceContinuation>;
  findDuplicatePhrases(phrases: Phrase[]): Promise<{ duplicateGroups: string[][] }>;
  generatePhraseBuilderOptions(phrase: Phrase): Promise<PhraseBuilderOptions>;
  evaluatePhraseAttempt(phrase: Phrase, userAttempt: string): Promise<PhraseEvaluation>;
  evaluateSpokenPhraseAttempt(phrase: Phrase, userAttempt: string): Promise<PhraseEvaluation>;
  healthCheck(): Promise<boolean>;
  getProviderName(): string;
  generateCardsFromTranscript(transcript: string, sourceLang: 'ru' | 'de'): Promise<{ russian: string; german: string; }[]>;
  generateCardsFromImage(imageData: { mimeType: string; data: string }, refinement?: string): Promise<{ cards: { russian: string; german: string; }[], categoryName: string }>;
  generateTopicCards(topic: string, refinement?: string, existingPhrases?: string[]): Promise<{ russian: string; german: string; }[]>;
  classifyTopic(topic: string): Promise<{ isCategory: boolean; categoryName: string; }>;
  getCategoryAssistantResponse(categoryName: string, existingPhrases: Phrase[], request: CategoryAssistantRequest): Promise<CategoryAssistantResponse>;
}