export const getGeminiApiKey = (): string | null => {
    const key = process.env.API_KEY;
    if (key && !key.includes('PASTE')) {
        return key;
    }
    return null;
};

export const getDeepseekApiKey = (): string | null => {
    const key = process.env.DEEPSEEK_API_KEY;
    if (key && !key.includes('PASTE')) {
        return key;
    }
    return null;
};
