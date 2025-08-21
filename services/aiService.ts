import { Phrase, ChatMessage, DeepDiveAnalysis, MovieExample } from '../types';

export interface AiService {
  generatePhrases(prompt: string): Promise<Omit<Phrase, 'id'>[]>;
  generateInitialExamples(phrase: Phrase): Promise<ChatMessage>;
  continueChat(phrase: Phrase, history: ChatMessage[], newMessage: string): Promise<ChatMessage>;
  generateDeepDiveAnalysis(phrase: Phrase): Promise<DeepDiveAnalysis>;
  generateMovieExamples(phrase: Phrase): Promise<MovieExample[]>;
  healthCheck(): Promise<boolean>;
  getProviderName(): string;
}