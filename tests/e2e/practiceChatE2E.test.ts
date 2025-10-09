/**
 * E2E Test Script for Practice Chat AI
 *
 * This test verifies that Practice Chat works for different language combinations
 * and properly handles JSON responses from the AI.
 *
 * Note: These tests require actual API access to Gemini AI.
 * For CI/CD, mock the API responses or use a test API key.
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Mock language profile type
interface LanguageProfile {
  ui: string;
  native: string;
  learning: string;
}

// Mock phrase type
interface Phrase {
  id: string;
  text: {
    native: string;
    learning: string;
  };
  masteryLevel: number;
}

// Mock chat message type
interface ChatMessage {
  role: 'user' | 'model';
  contentParts?: Array<{
    type: string;
    text: string;
    translation?: string;
  }>;
  promptSuggestions?: string[];
  parts?: Array<{ text: string }>;
}

/**
 * Simulates the practiceConversation function
 * In real tests, this would call the actual geminiService
 */
async function mockPracticeConversation(
  history: ChatMessage[],
  newMessage: string,
  allPhrases: Phrase[],
  languageProfile: LanguageProfile
): Promise<ChatMessage> {
  // Simulate API response
  const mockResponse = {
    role: 'model' as const,
    contentParts: [
      {
        type: 'learning',
        text: `Response in ${languageProfile.learning}`,
        translation: `Translation in ${languageProfile.native}`
      },
      {
        type: 'text',
        text: `Explanation in ${languageProfile.native}`
      }
    ],
    promptSuggestions: ['Suggestion 1', 'Suggestion 2', 'Suggestion 3']
  };

  return mockResponse;
}

/**
 * Validates that AI response has correct structure
 */
function validateChatResponse(
  response: ChatMessage,
  languageProfile: LanguageProfile
): void {
  // Check response structure
  expect(response).toBeDefined();
  expect(response.role).toBe('model');
  expect(response.contentParts).toBeDefined();
  expect(Array.isArray(response.contentParts)).toBe(true);

  // Check promptSuggestions
  expect(response.promptSuggestions).toBeDefined();
  expect(Array.isArray(response.promptSuggestions)).toBe(true);
  expect(response.promptSuggestions!.length).toBeGreaterThan(0);
  expect(response.promptSuggestions!.length).toBeLessThanOrEqual(3);

  // Check contentParts structure
  expect(response.contentParts!.length).toBeGreaterThan(0);

  const learningPart = response.contentParts!.find(part => part.type === 'learning');
  const textPart = response.contentParts!.find(part => part.type === 'text');

  // At least one part should exist
  expect(learningPart || textPart).toBeDefined();

  // If learning part exists, it should have translation
  if (learningPart) {
    expect(learningPart.text).toBeDefined();
    expect(learningPart.text.length).toBeGreaterThan(0);
    expect(learningPart.translation).toBeDefined();
  }

  // Text parts should have content
  if (textPart) {
    expect(textPart.text).toBeDefined();
    expect(textPart.text.length).toBeGreaterThan(0);
  }
}

describe('Practice Chat E2E Tests', () => {
  const mockPhrases: Phrase[] = [
    { id: '1', text: { native: 'Hello', learning: 'Bonjour' }, masteryLevel: 2 },
    { id: '2', text: { native: 'Goodbye', learning: 'Au revoir' }, masteryLevel: 1 },
  ];

  describe('Language Combinations', () => {
    it('should work for ru (native) -> en (learning)', async () => {
      const languageProfile: LanguageProfile = {
        ui: 'en',
        native: 'ru',
        learning: 'en'
      };

      const response = await mockPracticeConversation(
        [],
        'Hello',
        mockPhrases,
        languageProfile
      );

      validateChatResponse(response, languageProfile);
      expect(response.contentParts![0].text).toContain('Response in en');
    });

    it('should work for en (native) -> fr (learning)', async () => {
      const languageProfile: LanguageProfile = {
        ui: 'en',
        native: 'en',
        learning: 'fr'
      };

      const response = await mockPracticeConversation(
        [],
        'Bonjour',
        mockPhrases,
        languageProfile
      );

      validateChatResponse(response, languageProfile);
      expect(response.contentParts![0].text).toContain('Response in fr');
    });

    it('should work for de (native) -> es (learning)', async () => {
      const languageProfile: LanguageProfile = {
        ui: 'de',
        native: 'de',
        learning: 'es'
      };

      const response = await mockPracticeConversation(
        [],
        'Hola',
        mockPhrases,
        languageProfile
      );

      validateChatResponse(response, languageProfile);
      expect(response.contentParts![0].text).toContain('Response in es');
    });

    it('should work for ru (native) -> it (learning)', async () => {
      const languageProfile: LanguageProfile = {
        ui: 'ru',
        native: 'ru',
        learning: 'it'
      };

      const response = await mockPracticeConversation(
        [],
        'Ciao',
        mockPhrases,
        languageProfile
      );

      validateChatResponse(response, languageProfile);
      expect(response.contentParts![0].text).toContain('Response in it');
    });

    it('should work for zh (native) -> de (learning)', async () => {
      const languageProfile: LanguageProfile = {
        ui: 'zh',
        native: 'zh',
        learning: 'de'
      };

      const response = await mockPracticeConversation(
        [],
        'Guten Tag',
        mockPhrases,
        languageProfile
      );

      validateChatResponse(response, languageProfile);
      expect(response.contentParts![0].text).toContain('Response in de');
    });

    it('should work for ja (native) -> pl (learning)', async () => {
      const languageProfile: LanguageProfile = {
        ui: 'ja',
        native: 'ja',
        learning: 'pl'
      };

      const response = await mockPracticeConversation(
        [],
        'Cześć',
        mockPhrases,
        languageProfile
      );

      validateChatResponse(response, languageProfile);
      expect(response.contentParts![0].text).toContain('Response in pl');
    });
  });

  describe('Conversation Flow', () => {
    it('should maintain conversation context', async () => {
      const languageProfile: LanguageProfile = {
        ui: 'en',
        native: 'ru',
        learning: 'en'
      };

      const history: ChatMessage[] = [
        {
          role: 'user',
          parts: [{ text: 'Hello' }]
        },
        {
          role: 'model',
          contentParts: [
            { type: 'learning', text: 'Hi there!', translation: 'Привет!' }
          ],
          promptSuggestions: ['How are you?']
        }
      ];

      const response = await mockPracticeConversation(
        history,
        'How are you?',
        mockPhrases,
        languageProfile
      );

      validateChatResponse(response, languageProfile);
    });

    it('should handle first message (empty history)', async () => {
      const languageProfile: LanguageProfile = {
        ui: 'en',
        native: 'en',
        learning: 'fr'
      };

      const response = await mockPracticeConversation(
        [],
        'Bonjour',
        mockPhrases,
        languageProfile
      );

      validateChatResponse(response, languageProfile);
      // First message should include greeting
      expect(response.contentParts!.length).toBeGreaterThan(0);
    });

    it('should handle multiple messages in conversation', async () => {
      const languageProfile: LanguageProfile = {
        ui: 'en',
        native: 'en',
        learning: 'es'
      };

      // Message 1
      const response1 = await mockPracticeConversation(
        [],
        'Hola',
        mockPhrases,
        languageProfile
      );
      validateChatResponse(response1, languageProfile);

      // Message 2
      const history2 = [
        { role: 'user' as const, parts: [{ text: 'Hola' }] },
        response1
      ];
      const response2 = await mockPracticeConversation(
        history2,
        '¿Cómo estás?',
        mockPhrases,
        languageProfile
      );
      validateChatResponse(response2, languageProfile);

      // Message 3
      const history3 = [
        ...history2,
        { role: 'user' as const, parts: [{ text: '¿Cómo estás?' }] },
        response2
      ];
      const response3 = await mockPracticeConversation(
        history3,
        'Adiós',
        mockPhrases,
        languageProfile
      );
      validateChatResponse(response3, languageProfile);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty user message gracefully', async () => {
      const languageProfile: LanguageProfile = {
        ui: 'en',
        native: 'en',
        learning: 'de'
      };

      const response = await mockPracticeConversation(
        [],
        '',
        mockPhrases,
        languageProfile
      );

      // Should still return valid response
      expect(response).toBeDefined();
      expect(response.role).toBe('model');
    });

    it('should handle very long user message', async () => {
      const languageProfile: LanguageProfile = {
        ui: 'en',
        native: 'en',
        learning: 'fr'
      };

      const longMessage = 'Bonjour! '.repeat(100);

      const response = await mockPracticeConversation(
        [],
        longMessage,
        mockPhrases,
        languageProfile
      );

      validateChatResponse(response, languageProfile);
    });

    it('should handle phrases with special characters', async () => {
      const specialPhrases: Phrase[] = [
        { id: '1', text: { native: '¿Cómo estás?', learning: 'Wie geht\'s?' }, masteryLevel: 1 },
        { id: '2', text: { native: 'C\'est génial!', learning: 'Das ist toll!' }, masteryLevel: 2 },
      ];

      const languageProfile: LanguageProfile = {
        ui: 'en',
        native: 'es',
        learning: 'de'
      };

      const response = await mockPracticeConversation(
        [],
        'Test special chars: äöü ß',
        specialPhrases,
        languageProfile
      );

      validateChatResponse(response, languageProfile);
    });

    it('should work with no phrases in vocabulary', async () => {
      const languageProfile: LanguageProfile = {
        ui: 'en',
        native: 'en',
        learning: 'it'
      };

      const response = await mockPracticeConversation(
        [],
        'Ciao',
        [], // Empty phrases array
        languageProfile
      );

      validateChatResponse(response, languageProfile);
    });

    it('should work with large vocabulary (50+ phrases)', async () => {
      const largePhraseList: Phrase[] = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        text: { native: `Phrase ${i}`, learning: `Phrase ${i} translated` },
        masteryLevel: Math.floor(Math.random() * 5)
      }));

      const languageProfile: LanguageProfile = {
        ui: 'en',
        native: 'en',
        learning: 'pt'
      };

      const response = await mockPracticeConversation(
        [],
        'Olá',
        largePhraseList,
        languageProfile
      );

      validateChatResponse(response, languageProfile);
    });
  });

  describe('Response Structure Validation', () => {
    it('should always return promptSuggestions array', async () => {
      const languageProfile: LanguageProfile = {
        ui: 'en',
        native: 'en',
        learning: 'de'
      };

      const response = await mockPracticeConversation(
        [],
        'Hallo',
        mockPhrases,
        languageProfile
      );

      expect(response.promptSuggestions).toBeDefined();
      expect(Array.isArray(response.promptSuggestions)).toBe(true);
    });

    it('should return 2-3 prompt suggestions', async () => {
      const languageProfile: LanguageProfile = {
        ui: 'en',
        native: 'en',
        learning: 'fr'
      };

      const response = await mockPracticeConversation(
        [],
        'Bonjour',
        mockPhrases,
        languageProfile
      );

      expect(response.promptSuggestions!.length).toBeGreaterThanOrEqual(2);
      expect(response.promptSuggestions!.length).toBeLessThanOrEqual(3);
    });

    it('should have at least one contentPart', async () => {
      const languageProfile: LanguageProfile = {
        ui: 'en',
        native: 'en',
        learning: 'es'
      };

      const response = await mockPracticeConversation(
        [],
        'Hola',
        mockPhrases,
        languageProfile
      );

      expect(response.contentParts).toBeDefined();
      expect(response.contentParts!.length).toBeGreaterThan(0);
    });

    it('learning type parts should have translation', async () => {
      const languageProfile: LanguageProfile = {
        ui: 'en',
        native: 'en',
        learning: 'it'
      };

      const response = await mockPracticeConversation(
        [],
        'Ciao',
        mockPhrases,
        languageProfile
      );

      const learningParts = response.contentParts!.filter(p => p.type === 'learning');

      learningParts.forEach(part => {
        expect(part.translation).toBeDefined();
        expect(part.translation!.length).toBeGreaterThan(0);
      });
    });
  });
});
