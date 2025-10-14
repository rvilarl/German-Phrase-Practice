/**
 * Script to cleanup phrase romanization data
 *
 * This script fixes phrases where romanization/transcription is incorrectly
 * embedded in the phrase text (in parentheses or brackets) by:
 * 1. Extracting the romanization
 * 2. Removing it from the phrase text
 * 3. Storing it in the correct romanization.learning field
 *
 * Usage: Run this script from the browser console or integrate it into your app
 */

import type { Phrase } from '../types';

/**
 * Extract romanization patterns from text
 * Matches patterns like:
 * - "नमस्ते (namaste)"
 * - "こんにちは (konnichiwa)"
 * - "你好 (nǐ hǎo)"
 * - "مرحبا [marhaban]"
 */
function extractRomanization(text: string): { cleanText: string; romanization: string | null } {
    // Pattern 1: Text followed by romanization in parentheses
    // Matches: "текст (romanization)" or "текст(romanization)"
    const parenthesesPattern = /^(.+?)\s*\(([^)]+)\)\s*$/;
    const parenthesesMatch = text.match(parenthesesPattern);

    if (parenthesesMatch) {
        const cleanText = parenthesesMatch[1].trim();
        const romanization = parenthesesMatch[2].trim();

        // Check if romanization looks valid (Latin characters, numbers, spaces, diacritics)
        // This prevents false positives like "(optional)" or "(informal)"
        if (/^[a-zA-Z0-9\s\u0300-\u036f'',.-]+$/.test(romanization)) {
            return { cleanText, romanization };
        }
    }

    // Pattern 2: Text followed by romanization in square brackets
    // Matches: "текст [romanization]" or "текст[romanization]"
    const bracketsPattern = /^(.+?)\s*\[([^\]]+)\]\s*$/;
    const bracketsMatch = text.match(bracketsPattern);

    if (bracketsMatch) {
        const cleanText = bracketsMatch[1].trim();
        const romanization = bracketsMatch[2].trim();

        if (/^[a-zA-Z0-9\s\u0300-\u036f'',.-]+$/.test(romanization)) {
            return { cleanText, romanization };
        }
    }

    // No romanization found
    return { cleanText: text, romanization: null };
}

/**
 * Process a single phrase and clean up its romanization
 */
export function cleanupPhrase(phrase: Phrase): { updated: boolean; phrase: Phrase } {
    const learningText = phrase.text.learning;

    // Skip if phrase already has romanization in the correct field
    if (phrase.romanization?.learning) {
        return { updated: false, phrase };
    }

    // Try to extract romanization from the text
    const { cleanText, romanization } = extractRomanization(learningText);

    // If no romanization found or text didn't change, return as-is
    if (!romanization || cleanText === learningText) {
        return { updated: false, phrase };
    }

    // Create updated phrase with cleaned text and proper romanization field
    const updatedPhrase: Phrase = {
        ...phrase,
        text: {
            ...phrase.text,
            learning: cleanText
        },
        romanization: {
            learning: romanization
        }
    };

    return { updated: true, phrase: updatedPhrase };
}

/**
 * Process all phrases and return statistics
 */
export function cleanupAllPhrases(phrases: Phrase[]): {
    totalProcessed: number;
    totalUpdated: number;
    updatedPhrases: Phrase[];
    unchangedPhrases: Phrase[];
    examples: Array<{ before: string; after: string; romanization: string }>;
} {
    const updatedPhrases: Phrase[] = [];
    const unchangedPhrases: Phrase[] = [];
    const examples: Array<{ before: string; after: string; romanization: string }> = [];
    let totalUpdated = 0;

    for (const phrase of phrases) {
        const result = cleanupPhrase(phrase);

        if (result.updated) {
            updatedPhrases.push(result.phrase);
            totalUpdated++;

            // Collect first 10 examples for review
            if (examples.length < 10) {
                examples.push({
                    before: phrase.text.learning,
                    after: result.phrase.text.learning,
                    romanization: result.phrase.romanization?.learning || ''
                });
            }
        } else {
            unchangedPhrases.push(result.phrase);
        }
    }

    return {
        totalProcessed: phrases.length,
        totalUpdated,
        updatedPhrases,
        unchangedPhrases,
        examples
    };
}

/**
 * Generate a report of the cleanup operation
 */
export function generateCleanupReport(result: ReturnType<typeof cleanupAllPhrases>): string {
    const { totalProcessed, totalUpdated, examples } = result;

    let report = `=== Phrase Romanization Cleanup Report ===\n\n`;
    report += `Total phrases processed: ${totalProcessed}\n`;
    report += `Total phrases updated: ${totalUpdated}\n`;
    report += `Total phrases unchanged: ${totalProcessed - totalUpdated}\n`;
    report += `Update rate: ${((totalUpdated / totalProcessed) * 100).toFixed(2)}%\n\n`;

    if (examples.length > 0) {
        report += `=== Examples of Changes ===\n\n`;
        examples.forEach((example, index) => {
            report += `${index + 1}. Before: "${example.before}"\n`;
            report += `   After:  "${example.after}"\n`;
            report += `   Romanization: "${example.romanization}"\n\n`;
        });
    }

    return report;
}

/**
 * Browser console helper function
 * Usage: In browser console, run:
 *
 * import { runCleanup } from './scripts/cleanupPhraseRomanization';
 * runCleanup();
 */
export async function runCleanup() {
    console.log('Starting phrase romanization cleanup...');

    // This assumes you have access to your backend service in the console
    // You'll need to adapt this based on your actual data access pattern
    const backendService = (window as any).backendService;

    if (!backendService) {
        console.error('Backend service not available. Please ensure it is exposed to window.');
        return;
    }

    try {
        // Fetch all phrases
        console.log('Fetching all phrases...');
        const allPhrases = await backendService.getAllPhrases();
        console.log(`Fetched ${allPhrases.length} phrases`);

        // Run cleanup
        console.log('Running cleanup...');
        const result = cleanupAllPhrases(allPhrases);

        // Generate and display report
        const report = generateCleanupReport(result);
        console.log(report);

        // If there are updates, confirm before saving
        if (result.totalUpdated > 0) {
            const confirmed = confirm(
                `Found ${result.totalUpdated} phrases to update. Do you want to save these changes?`
            );

            if (confirmed) {
                console.log('Saving updated phrases...');

                for (const phrase of result.updatedPhrases) {
                    await backendService.updatePhrase(phrase.id, phrase);
                }

                console.log('✅ All phrases updated successfully!');
                return result;
            } else {
                console.log('❌ Cleanup cancelled by user');
                return null;
            }
        } else {
            console.log('✅ No phrases needed updating');
            return result;
        }

    } catch (error) {
        console.error('Error during cleanup:', error);
        throw error;
    }
}

// Export for testing
export const _test = {
    extractRomanization
};
