// Test script for AI generation - run this in browser console when app is loaded
// This will test if AI generation works for a language with gaps

async function testAIGeneration() {
  console.log('Testing AI generation...');

  try {
    // Import the AI service
    const { translateLocaleTemplate } = await import('/src/services/geminiService.ts');

    // Read the base template (English)
    const baseResponse = await fetch('/src/i18n/en.json');
    const baseTemplate = await baseResponse.json();

    console.log(`Base template has ${Object.keys(baseTemplate).length} top-level keys`);

    // Test with French (which has gaps)
    const testLang = 'fr';
    console.log(`Testing AI generation for ${testLang}...`);

    const startTime = Date.now();
    const generated = await translateLocaleTemplate(baseTemplate, testLang);
    const endTime = Date.now();

    console.log(`AI generation completed in ${(endTime - startTime) / 1000} seconds`);

    // Basic validation
    if (typeof generated !== 'object' || generated === null || Array.isArray(generated)) {
      throw new Error('Generated locale is not a valid object');
    }

    console.log(`Generated locale has ${Object.keys(generated).length} top-level keys`);

    // Check if it has some translations
    let translatedCount = 0;
    let emptyCount = 0;

    function countTranslations(obj, path = '') {
      Object.entries(obj).forEach(([key, value]) => {
        const currentPath = path ? `${path}.${key}` : key;
        if (typeof value === 'string') {
          if (value.trim().length > 0) {
            translatedCount++;
          } else {
            emptyCount++;
          }
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          countTranslations(value, currentPath);
        }
      });
    }

    countTranslations(generated);
    console.log(`Generated locale has ${translatedCount} translated strings and ${emptyCount} empty strings`);

    if (translatedCount > 0) {
      console.log('✅ AI generation test PASSED - generated some translations');
      return { success: true, translatedCount, emptyCount, generated };
    } else {
      console.log('❌ AI generation test FAILED - generated only empty strings');
      return { success: false, translatedCount, emptyCount, generated };
    }

  } catch (error) {
    console.error('❌ AI generation test FAILED with error:', error);
    return { success: false, error: error.message };
  }
}

// Make it available globally
window.testAIGeneration = testAIGeneration;

console.log('AI generation test loaded. Run testAIGeneration() in console to test.');