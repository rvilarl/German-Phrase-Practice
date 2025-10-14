/**
 * Service for regenerating phrase romanization using AI
 */

import type { Phrase } from '../types';
import { quickFixPhrase, extractEmbeddedRomanization } from './phraseValidationService';
import type { AiService } from './aiService';

/**
 * Result of phrase regeneration
 */
export interface RegenerationResult {
    success: boolean;
    fixedPhrase?: Phrase;
    error?: string;
    method: 'quick-fix' | 'ai-regeneration' | 'failed';
}

/**
 * Batch regeneration progress
 */
export interface RegenerationProgress {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    currentPhrase?: string;
}

/**
 * Try to fix a phrase using quick fix (no AI needed)
 */
function tryQuickFix(phrase: Phrase): RegenerationResult {
    const fixedPhrase = quickFixPhrase(phrase);

    if (fixedPhrase) {
        return {
            success: true,
            fixedPhrase,
            method: 'quick-fix'
        };
    }

    return {
        success: false,
        method: 'failed',
        error: 'Quick fix not applicable'
    };
}

/**
 * Regenerate romanization using AI
 */
async function regenerateWithAI(
    phrase: Phrase,
    aiService: AiService,
    nativeLanguageName: string,
    learningLanguageName: string
): Promise<RegenerationResult> {
    try {
        // Extract clean text if it has embedded romanization
        const { cleanText } = extractEmbeddedRomanization(phrase.text.learning);

        // Create a specialized prompt for romanization generation
        const prompt = `You are a linguistic expert. Generate ONLY the romanization/transcription for the following ${learningLanguageName} phrase.

Phrase: "${cleanText}"

Instructions:
- For Chinese: Provide Pinyin with tone marks (e.g., "nǐ hǎo")
- For Japanese: Provide Romaji (e.g., "konnichiwa")
- For Hindi: Provide Devanagari transliteration (e.g., "namaste")
- For Arabic: Provide Arabic transliteration (e.g., "marhaban")

Return ONLY the romanization text, nothing else.`;

        // Use the AI service to generate romanization
        // Note: This uses a simple text generation, not structured output
        const response = await (aiService as any).generateContent?.(prompt);

        if (!response) {
            throw new Error('AI service did not return a response');
        }

        // Extract romanization from response
        const romanization = typeof response === 'string'
            ? response.trim()
            : response.text?.trim() || '';

        if (!romanization) {
            throw new Error('AI returned empty romanization');
        }

        // Create fixed phrase
        const fixedPhrase: Phrase = {
            ...phrase,
            text: {
                ...phrase.text,
                learning: cleanText
            },
            romanization: {
                learning: romanization
            }
        };

        return {
            success: true,
            fixedPhrase,
            method: 'ai-regeneration'
        };

    } catch (error) {
        console.error('AI regeneration failed for phrase:', phrase.id, error);
        return {
            success: false,
            method: 'failed',
            error: (error as Error).message
        };
    }
}

/**
 * Fix a single phrase (only uses quick fix, no AI)
 */
export async function fixPhrase(
    phrase: Phrase,
    aiService: AiService,
    nativeLanguageName: string,
    learningLanguageName: string
): Promise<RegenerationResult> {
    // Try quick fix
    const quickFixResult = tryQuickFix(phrase);
    if (quickFixResult.success) {
        console.log(`✅ Quick fixed phrase: ${phrase.text.learning}`);
        return quickFixResult;
    }

    // Quick fix not applicable - skip this phrase
    // (We don't use AI to avoid complexity and API calls)
    console.log(`⏭️  Skipping phrase (no embedded romanization): ${phrase.text.learning}`);
    return {
        success: false,
        method: 'failed',
        error: 'Quick fix not applicable, AI generation disabled'
    };
}

/**
 * Fix multiple phrases in batch with progress callback
 */
export async function fixPhrasesInBatch(
    phrases: Phrase[],
    aiService: AiService,
    nativeLanguageName: string,
    learningLanguageName: string,
    onProgress?: (progress: RegenerationProgress) => void
): Promise<{
    fixedPhrases: Phrase[];
    failedPhrases: Array<{ phrase: Phrase; error: string }>;
    quickFixCount: number;
    aiFixCount: number;
}> {
    const fixedPhrases: Phrase[] = [];
    const failedPhrases: Array<{ phrase: Phrase; error: string }> = [];
    let quickFixCount = 0;
    let aiFixCount = 0;

    for (let i = 0; i < phrases.length; i++) {
        const phrase = phrases[i];

        // Report progress
        if (onProgress) {
            onProgress({
                total: phrases.length,
                processed: i,
                successful: fixedPhrases.length,
                failed: failedPhrases.length,
                currentPhrase: phrase.text.learning
            });
        }

        try {
            const result = await fixPhrase(phrase, aiService, nativeLanguageName, learningLanguageName);

            if (result.success && result.fixedPhrase) {
                fixedPhrases.push(result.fixedPhrase);

                if (result.method === 'quick-fix') {
                    quickFixCount++;
                } else if (result.method === 'ai-regeneration') {
                    aiFixCount++;
                }
            } else {
                failedPhrases.push({
                    phrase,
                    error: result.error || 'Unknown error'
                });
            }

            // Add delay between AI calls to avoid rate limiting
            if (result.method === 'ai-regeneration') {
                await new Promise(resolve => setTimeout(resolve, 500));
            }

        } catch (error) {
            console.error('Failed to fix phrase:', phrase.id, error);
            failedPhrases.push({
                phrase,
                error: (error as Error).message
            });
        }
    }

    // Final progress update
    if (onProgress) {
        onProgress({
            total: phrases.length,
            processed: phrases.length,
            successful: fixedPhrases.length,
            failed: failedPhrases.length
        });
    }

    return {
        fixedPhrases,
        failedPhrases,
        quickFixCount,
        aiFixCount
    };
}

/**
 * Generate a summary report of the batch fix operation
 */
export function generateFixReport(result: {
    fixedPhrases: Phrase[];
    failedPhrases: Array<{ phrase: Phrase; error: string }>;
    quickFixCount: number;
    aiFixCount: number;
}): string {
    const total = result.fixedPhrases.length + result.failedPhrases.length;
    const successRate = total > 0 ? ((result.fixedPhrases.length / total) * 100).toFixed(1) : '0';

    let report = `🔧 Auto-Fix Report\n`;
    report += `━━━━━━━━━━━━━━━━━\n`;
    report += `Total phrases: ${total}\n`;
    report += `✅ Fixed: ${result.fixedPhrases.length} (${successRate}%)\n`;
    report += `   • Quick fix: ${result.quickFixCount}\n`;
    report += `   • AI regeneration: ${result.aiFixCount}\n`;
    report += `❌ Failed: ${result.failedPhrases.length}\n`;

    if (result.failedPhrases.length > 0) {
        report += `\nFailed phrases:\n`;
        result.failedPhrases.slice(0, 5).forEach(({ phrase, error }) => {
            report += `  • ${phrase.text.learning}: ${error}\n`;
        });

        if (result.failedPhrases.length > 5) {
            report += `  ... and ${result.failedPhrases.length - 5} more\n`;
        }
    }

    return report;
}
