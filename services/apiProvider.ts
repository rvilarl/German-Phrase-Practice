import { geminiService } from './geminiService';
import { deepseekService } from './deepseekService';
import { AiService } from './aiService';
import { getGeminiApiKey, getDeepseekApiKey } from './env';

export type ApiProviderType = 'gemini' | 'deepseek';

const providers: { [key in ApiProviderType]?: AiService } = {};

if (getGeminiApiKey()) {
    providers.gemini = geminiService;
}
if (getDeepseekApiKey()) {
    providers.deepseek = deepseekService;
}

export const getProviderPriorityList = (): { provider: AiService, type: ApiProviderType }[] => {
    const list: { provider: AiService, type: ApiProviderType }[] = [];
    if (providers.gemini) {
        list.push({ provider: providers.gemini, type: 'gemini' });
    }
    if (providers.deepseek) {
        list.push({ provider: providers.deepseek, type: 'deepseek' });
    }
    return list;
};

export const getFallbackProvider = (currentType: ApiProviderType): { provider: AiService, type: ApiProviderType } | null => {
    if (currentType === 'gemini' && providers.deepseek) {
        return { provider: providers.deepseek, type: 'deepseek' };
    }
    // If current is deepseek, we could fallback to gemini if it exists.
    if (currentType === 'deepseek' && providers.gemini) {
        return { provider: providers.gemini, type: 'gemini' };
    }
    return null;
}