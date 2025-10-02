export const getGeminiApiKey = (): string | null => {
    const key = import.meta.env.VITE_API_KEY;
    if (key && !key.includes('PASTE')) {
        return key;
    }
    return null;
};

export const getDeepseekApiKey = (): string | null => {
    const key = import.meta.env.VITE_DEEPSEEK_API_KEY;
    if (key && !key.includes('PASTE')) {
        return key;
    }
    return null;
};
