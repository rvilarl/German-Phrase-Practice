import { Phrase, ChatMessage, DeepDiveAnalysis, MovieExample, WordAnalysis, VerbConjugation, NounDeclension, SentenceContinuation } from '../types';

export interface AiService {
  generatePhrases(prompt: string): Promise<Omit<Phrase, 'id'>[]>;
  generateSinglePhrase(russianPhrase: string): Promise<{ german: string; russian: string; }>;
  generateInitialExamples(phrase: Phrase): Promise<ChatMessage>;
  continueChat(phrase: Phrase, history: ChatMessage[], newMessage: string): Promise<ChatMessage>;
  generateDeepDiveAnalysis(phrase: Phrase): Promise<DeepDiveAnalysis>;
  generateMovieExamples(phrase: Phrase): Promise<MovieExample[]>;
  analyzeWordInPhrase(phrase: Phrase, word: string): Promise<WordAnalysis>;
  conjugateVerb(infinitive: string): Promise<VerbConjugation>;
  declineNoun(noun: string, article: string): Promise<NounDeclension>;
  generateSentenceContinuations(russianPhrase: string): Promise<SentenceContinuation>;
  healthCheck(): Promise<boolean>;
  getProviderName(): string;
}