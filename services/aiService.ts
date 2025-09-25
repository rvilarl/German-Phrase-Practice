import { Phrase, ChatMessage, DeepDiveAnalysis, MovieExample, WordAnalysis, VerbConjugation, NounDeclension, AdjectiveDeclension, SentenceContinuation, TranslationChatRequest, TranslationChatResponse, PhraseBuilderOptions, PhraseEvaluation } from '../types';

export interface AiService {
  generatePhrases(prompt: string): Promise<Omit<Phrase, 'id'>[]>;
  generateSinglePhrase(russianPhrase: string): Promise<{ german: string; russian: string; }>;
  translatePhrase(russianPhrase: string): Promise<{ german: string }>;
  translateGermanToRussian(germanPhrase: string): Promise<{ russian: string }>;
  improvePhrase(originalRussian: string, currentGerman: string): Promise<{ suggestedGerman: string; explanation: string }>;
  generateInitialExamples(phrase: Phrase): Promise<ChatMessage>;
  continueChat(phrase: Phrase, history: ChatMessage[], newMessage: string): Promise<ChatMessage>;
  guideToTranslation(phrase: Phrase, history: ChatMessage[], userAnswer: string): Promise<ChatMessage>;
  discussTranslation(request: TranslationChatRequest): Promise<TranslationChatResponse>;
  generateDeepDiveAnalysis(phrase: Phrase): Promise<DeepDiveAnalysis>;
  generateMovieExamples(phrase: Phrase): Promise<MovieExample[]>;
  analyzeWordInPhrase(phrase: Phrase, word: string): Promise<WordAnalysis>;
  conjugateVerb(infinitive: string): Promise<VerbConjugation>;
  declineNoun(noun: string, article: string): Promise<NounDeclension>;
  declineAdjective(adjective: string): Promise<AdjectiveDeclension>;
  generateSentenceContinuations(russianPhrase: string): Promise<SentenceContinuation>;
  findDuplicatePhrases(phrases: Phrase[]): Promise<{ duplicateGroups: string[][] }>;
  generatePhraseBuilderOptions(phrase: Phrase): Promise<PhraseBuilderOptions>;
  evaluatePhraseAttempt(phrase: Phrase, userAttempt: string): Promise<PhraseEvaluation>;
  evaluateSpokenPhraseAttempt(phrase: Phrase, userAttempt: string): Promise<PhraseEvaluation>;
  generateQuickReplyOptions(phrase: Phrase): Promise<{ options: string[] }>;
  healthCheck(): Promise<boolean>;
  getProviderName(): string;
  generateCardsFromTranscript(transcript: string, sourceLang: 'ru' | 'de'): Promise<{ russian: string; german: string; }[]>;
  generateTopicCards(topic: string, refinement?: string): Promise<{ russian: string; german: string; }[]>;
}