import { GEMINI_API_KEY, DEEPSEEK_API_KEY } from '../env';

const config = {
    geminiApiKey: (GEMINI_API_KEY && !GEMINI_API_KEY.includes('PASTE')) ? GEMINI_API_KEY : null,
    deepseekApiKey: (DEEPSEEK_API_KEY && !DEEPSEEK_API_KEY.includes('PASTE')) ? DEEPSEEK_API_KEY : null,
};

export const getGeminiApiKey = (): string | null => config.geminiApiKey;

export const getDeepseekApiKey = (): string | null => config.deepseekApiKey;