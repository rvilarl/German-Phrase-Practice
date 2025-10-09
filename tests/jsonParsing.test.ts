import { describe, it, expect } from 'vitest';

// Mock implementation of JSON parsing logic from practiceConversation
function parseAiResponse(jsonText: string): {
  responseParts: Array<{ type: string; text: string; translation?: string }>;
  promptSuggestions: string[];
} {
  // 🛡️ CHECK that response is not empty
  if (!jsonText || jsonText.trim().length === 0) {
    console.error('[parseAiResponse] Empty response');
    return {
      responseParts: [{
        type: 'text',
        text: 'I apologize, but I received an empty response. Please try again.'
      }],
      promptSuggestions: [],
    };
  }

  // 🛡️ ROBUST PARSING with try-catch
  let parsedResponse;
  try {
    parsedResponse = JSON.parse(jsonText);
  } catch (parseError) {
    console.error('[parseAiResponse] JSON parse failed:', parseError);

    // 🔄 FALLBACK
    const fallbackResponse = {
      responseParts: [{
        type: 'text',
        text: jsonText.substring(0, 500) + (jsonText.length > 500 ? '...' : '') ||
              'I apologize, but I had trouble generating a proper response. Could you try again?'
      }],
      promptSuggestions: []
    };
    parsedResponse = fallbackResponse;
  }

  // 🛡️ VALIDATE structure
  if (!parsedResponse.responseParts || !Array.isArray(parsedResponse.responseParts) || parsedResponse.responseParts.length === 0) {
    console.warn('[parseAiResponse] Invalid response structure, using fallback');
    parsedResponse.responseParts = [{
      type: 'text',
      text: 'Response structure invalid. Please try again.'
    }];
  }

  if (!parsedResponse.promptSuggestions || !Array.isArray(parsedResponse.promptSuggestions)) {
    parsedResponse.promptSuggestions = [];
  }

  // Return only the expected fields (strip extra fields)
  return {
    responseParts: parsedResponse.responseParts,
    promptSuggestions: parsedResponse.promptSuggestions
  };
}

describe('JSON Parsing - practiceConversation', () => {
  it('should parse valid JSON response correctly', () => {
    const validJson = JSON.stringify({
      responseParts: [
        { type: 'learning', text: 'Bonjour!', translation: 'Hello!' },
        { type: 'text', text: 'This is a greeting.' }
      ],
      promptSuggestions: ['Comment ça va?', 'Merci', 'Au revoir']
    });

    const result = parseAiResponse(validJson);

    expect(result.responseParts).toHaveLength(2);
    expect(result.responseParts[0].type).toBe('learning');
    expect(result.responseParts[0].text).toBe('Bonjour!');
    expect(result.responseParts[0].translation).toBe('Hello!');
    expect(result.promptSuggestions).toHaveLength(3);
    expect(result.promptSuggestions[0]).toBe('Comment ça va?');
  });

  it('should handle empty response with fallback', () => {
    const result = parseAiResponse('');

    expect(result.responseParts).toHaveLength(1);
    expect(result.responseParts[0].type).toBe('text');
    expect(result.responseParts[0].text).toContain('empty response');
    expect(result.promptSuggestions).toEqual([]);
  });

  it('should handle whitespace-only response', () => {
    const result = parseAiResponse('   \n\t   ');

    expect(result.responseParts).toHaveLength(1);
    expect(result.responseParts[0].type).toBe('text');
    expect(result.responseParts[0].text).toContain('empty response');
  });

  it('should handle invalid JSON with fallback', () => {
    const invalidJson = '{ "responseParts": [{ "type": "text", "text": "Hello" }';

    const result = parseAiResponse(invalidJson);

    expect(result.responseParts).toHaveLength(1);
    expect(result.responseParts[0].type).toBe('text');
    expect(result.responseParts[0].text).toContain(invalidJson.substring(0, 50));
    expect(result.promptSuggestions).toEqual([]);
  });

  it('should handle unexpected token error', () => {
    // This was the original bug - "Unexpected token" when AI returned non-JSON
    const malformedResponse = 'This is not JSON at all!';

    const result = parseAiResponse(malformedResponse);

    expect(result.responseParts).toHaveLength(1);
    expect(result.responseParts[0].text).toContain('This is not JSON');
  });

  it('should handle JSON with missing responseParts', () => {
    const jsonWithoutParts = JSON.stringify({
      promptSuggestions: ['Suggestion 1', 'Suggestion 2']
    });

    const result = parseAiResponse(jsonWithoutParts);

    expect(result.responseParts).toHaveLength(1);
    expect(result.responseParts[0].type).toBe('text');
    expect(result.responseParts[0].text).toContain('invalid');
    expect(result.promptSuggestions).toHaveLength(2);
  });

  it('should handle JSON with invalid responseParts (not array)', () => {
    const jsonWithInvalidParts = JSON.stringify({
      responseParts: 'This should be an array',
      promptSuggestions: []
    });

    const result = parseAiResponse(jsonWithInvalidParts);

    expect(result.responseParts).toHaveLength(1);
    expect(result.responseParts[0].type).toBe('text');
    expect(result.promptSuggestions).toEqual([]);
  });

  it('should handle JSON with missing promptSuggestions', () => {
    const jsonWithoutSuggestions = JSON.stringify({
      responseParts: [{ type: 'text', text: 'Hello' }]
    });

    const result = parseAiResponse(jsonWithoutSuggestions);

    expect(result.responseParts).toHaveLength(1);
    expect(result.responseParts[0].text).toBe('Hello');
    expect(result.promptSuggestions).toEqual([]);
  });

  it('should truncate very long non-JSON text to 500 chars', () => {
    const longText = 'A'.repeat(1000);

    const result = parseAiResponse(longText);

    expect(result.responseParts[0].text.length).toBeLessThanOrEqual(503); // 500 + '...'
    expect(result.responseParts[0].text).toContain('...');
  });

  it('should preserve short non-JSON text without truncation', () => {
    const shortText = 'Short error message';

    const result = parseAiResponse(shortText);

    expect(result.responseParts[0].text).toBe(shortText);
    expect(result.responseParts[0].text).not.toContain('...');
  });

  it('should handle response with type "learning" correctly', () => {
    const learningResponse = JSON.stringify({
      responseParts: [
        {
          type: 'learning',
          text: 'Wie geht es dir?',
          translation: 'How are you?'
        }
      ],
      promptSuggestions: ['Gut, danke', 'Sehr gut']
    });

    const result = parseAiResponse(learningResponse);

    expect(result.responseParts[0].type).toBe('learning');
    expect(result.responseParts[0].translation).toBe('How are you?');
  });

  it('should handle mixed type responseParts', () => {
    const mixedResponse = JSON.stringify({
      responseParts: [
        { type: 'learning', text: 'Guten Tag', translation: 'Good day' },
        { type: 'text', text: 'This is a formal greeting' },
        { type: 'learning', text: 'Auf Wiedersehen', translation: 'Goodbye' }
      ],
      promptSuggestions: ['Danke', 'Bitte']
    });

    const result = parseAiResponse(mixedResponse);

    expect(result.responseParts).toHaveLength(3);
    expect(result.responseParts[0].type).toBe('learning');
    expect(result.responseParts[1].type).toBe('text');
    expect(result.responseParts[2].type).toBe('learning');
  });

  it('should handle response with empty arrays', () => {
    const emptyArraysResponse = JSON.stringify({
      responseParts: [],
      promptSuggestions: []
    });

    const result = parseAiResponse(emptyArraysResponse);

    // Empty responseParts should trigger validation fallback
    expect(result.responseParts).toHaveLength(1);
    expect(result.responseParts[0].type).toBe('text');
    expect(result.promptSuggestions).toEqual([]);
  });

  it('should handle JSON with extra fields (should be ignored)', () => {
    const jsonWithExtra = JSON.stringify({
      responseParts: [{ type: 'text', text: 'Hello' }],
      promptSuggestions: ['Hi'],
      extraField: 'This should be ignored',
      anotherExtra: 123
    });

    const result = parseAiResponse(jsonWithExtra);

    expect(result.responseParts).toHaveLength(1);
    expect(result.promptSuggestions).toHaveLength(1);
    expect((result as any).extraField).toBeUndefined();
  });
});
