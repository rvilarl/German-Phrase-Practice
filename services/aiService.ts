import { Phrase, ChatMessage, DeepDiveAnalysis, MovieExample, WordAnalysis, VerbConjugation, NounDeclension, SentenceContinuation, TranslationChatRequest, TranslationChatResponse, PhraseBuilderOptions, PhraseEvaluation } from '../types';

export interface AiService {
  generatePhrases(prompt: string): Promise<Omit<Phrase, 'id'>[]>;
  generateSinglePhrase(russianPhrase: string): Promise<{ german: string; russian: string; }>;
  translatePhrase(russianPhrase: string): Promise<{ german: string }>;
  translateGermanToRussian(germanPhrase: string): Promise<{ russian: string }>;
  improvePhrase(originalRussian: string, currentGerman: string): Promise<{ suggestedGerman: string; explanation: string }>;
  generateInitialExamples(phrase: Phrase): Promise<ChatMessage>;
  continueChat(phrase: Phrase, history: ChatMessage[], newMessage: string): Promise<ChatMessage>;
  discussTranslation(request: TranslationChatRequest): Promise<TranslationChatResponse>;
  generateDeepDiveAnalysis(phrase: Phrase): Promise<DeepDiveAnalysis>;
  generateMovieExamples(phrase: Phrase): Promise<MovieExample[]>;
  analyzeWordInPhrase(phrase: Phrase, word: string): Promise<WordAnalysis>;
  conjugateVerb(infinitive: string): Promise<VerbConjugation>;
  declineNoun(noun: string, article: string): Promise<NounDeclension>;
  generateSentenceContinuations(russianPhrase: string): Promise<SentenceContinuation>;
  findDuplicatePhrases(phrases: Phrase[]): Promise<{ duplicateGroups: string[][] }>;
  generatePhraseBuilderOptions(phrase: Phrase): Promise<PhraseBuilderOptions>;
  evaluatePhraseAttempt(phrase: Phrase, userAttempt: string): Promise<PhraseEvaluation>;
  evaluateSpokenPhraseAttempt(phrase: Phrase, userAttempt: string): Promise<PhraseEvaluation>;
  healthCheck(): Promise<boolean>;
  getProviderName(): string;
}