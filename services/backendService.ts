import { Phrase, Category } from '../types';
import { getApiBaseUrl } from './env.ts';
import { getAccessToken, notifyUnauthorized } from './authTokenStore.ts';

const API_BASE_URL = getApiBaseUrl();

// --- Color Conversion Maps ---
const tailwindToHexMap: Record<string, string> = {
  'bg-slate-500': '#64748b',
  'bg-red-500': '#ef4444',
  'bg-orange-500': '#f97316',
  'bg-amber-500': '#f59e0b',
  'bg-yellow-500': '#eab308',
  'bg-lime-500': '#84cc16',
  'bg-green-500': '#22c55e',
  'bg-emerald-500': '#10b981',
  'bg-teal-500': '#14b8a6',
  'bg-cyan-500': '#06b6d4',
  'bg-sky-500': '#0ea5e9',
  'bg-blue-500': '#3b82f6',
  'bg-indigo-500': '#6366f1',
  'bg-violet-500': '#8b5cf6',
  'bg-purple-500': '#a855f7',
  'bg-fuchsia-500': '#d946ef',
  'bg-pink-500': '#ec4899',
  'bg-rose-500': '#f43f5e',
};

const hexToTailwindMap: Record<string, string> = Object.fromEntries(
  Object.entries(tailwindToHexMap).map(([key, value]) => [value, key])
);


// --- Data Conversion Helpers ---

const feCategory = (beCategory: any): Category => ({
    id: beCategory.id.toString(),
    name: beCategory.name,
    color: hexToTailwindMap[beCategory.color.toLowerCase()] || 'bg-slate-500',
    isFoundational: beCategory.is_foundational,
});

const fePhrase = (bePhrase: any): Phrase => {
    const categoryId = bePhrase.category_id ?? bePhrase.category;
    // FIX: Map backend's flat structure to the frontend's nested `text` object.
    return {
        id: bePhrase.id.toString(),
        text: {
            native: bePhrase.russian,
            learning: bePhrase.german,
        },
        category: categoryId.toString(),
        romanization: bePhrase.transcription ? { learning: bePhrase.transcription } : undefined,
        context: bePhrase.context ? { native: bePhrase.context } : undefined,
        masteryLevel: bePhrase.masteryLevel,
        lastReviewedAt: bePhrase.lastReviewedAt,
        nextReviewAt: bePhrase.nextReviewAt,
        knowCount: bePhrase.knowCount,
        knowStreak: bePhrase.knowStreak,
        isMastered: bePhrase.isMastered,
        lapses: bePhrase.lapses,
    };
};

const handleResponse = async (response: Response) => {
    if (response.status === 401 || response.status === 403) {
        notifyUnauthorized();
    }

    if (!response.ok) {
        const errorText = await response.text();
        let errorData: any;
        try {
            errorData = JSON.parse(errorText);
        } catch (e) {
            const statusText = response.statusText || 'Error';
            errorData = { error: `${response.status} ${statusText}`, details: errorText };
        }
        const message = errorData?.error || `Request failed with status ${response.status}`;
        throw new Error(message);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (url: RequestInfo, options: RequestInit = {}, retries = 3, initialDelay = 500): Promise<Response> => {
    let delay = initialDelay;
    for (let i = 0; i < retries; i++) {
        try {
            const token = getAccessToken();
            const headers = new Headers(options.headers || {});
            if (!headers.has('Accept')) {
                headers.set('Accept', 'application/json');
            }
            if (options.body && !headers.has('Content-Type')) {
                headers.set('Content-Type', 'application/json');
            }
            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }

            const response = await fetch(url, { ...options, headers });

            if (response.ok || response.status === 401 || response.status === 403) {
                return response;
            }

            if (response.status === 429) {
                console.warn(`Rate limit exceeded. Attempt ${i + 1}/${retries}. Retrying in ${delay}ms...`);
                if (i < retries - 1) {
                    await sleep(delay + Math.random() * 200);
                    delay *= 2;
                    continue;
                }
            }

            return response;

        } catch (error) {
            console.error(`Fetch failed on attempt ${i + 1}/${retries}:`, error);
            if (i < retries - 1) {
                await sleep(delay + Math.random() * 200);
                delay *= 2;
            } else {
                throw error;
            }
        }
    }
    throw new Error('Request failed after all retries.');
};


export const fetchInitialData = async (): Promise<{ categories: Category[], phrases: Phrase[] }> => {
    let response = await fetchWithRetry(`${API_BASE_URL}/initial-data`);

    if (response.status === 404) {
        await loadInitialData();
        response = await fetchWithRetry(`${API_BASE_URL}/initial-data`);
    }

    const data = await handleResponse(response);
    return {
        categories: data.categories.map(feCategory),
        phrases: data.phrases.map(fePhrase),
    };
};

export const createPhrase = async (phraseData: Omit<Phrase, 'id' | 'masteryLevel' | 'lastReviewedAt' | 'nextReviewAt' | 'knowCount' | 'knowStreak' | 'isMastered' | 'lapses'>): Promise<Phrase> => {
    const response = await fetchWithRetry(`${API_BASE_URL}/phrases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // FIX: Map frontend's nested `text` object to backend's flat properties.
        body: JSON.stringify({
            russian: phraseData.text.native,
            german: phraseData.text.learning,
            category_id: parseInt(phraseData.category, 10),
        })
    });
    const created = await handleResponse(response);
    return fePhrase(created);
};

export const updatePhrase = async (phrase: Phrase): Promise<Phrase> => {
    // FIX: Map frontend's nested object structure to the flat properties expected by the backend.
    const beData = {
        russian: phrase.text.native,
        german: phrase.text.learning,
        category_id: parseInt(phrase.category, 10),
        transcription: phrase.romanization?.learning,
        context: phrase.context?.native,
        masteryLevel: phrase.masteryLevel,
        lastReviewedAt: phrase.lastReviewedAt,
        nextReviewAt: phrase.nextReviewAt,
        knowCount: phrase.knowCount,
        knowStreak: phrase.knowStreak,
        isMastered: phrase.isMastered,
        lapses: phrase.lapses,
    };

    if (isNaN(beData.category_id)) {
        throw new Error('Category ID is required and must be a number');
    }

    const response = await fetchWithRetry(`${API_BASE_URL}/phrases/${phrase.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(beData)
    });
    const updated = await handleResponse(response);
    
    return fePhrase({ ...phrase, ...updated });
};

export const deletePhrase = async (phraseId: string): Promise<void> => {
    await handleResponse(await fetchWithRetry(`${API_BASE_URL}/phrases/${phraseId}`, { method: 'DELETE' }));
};

export const createCategory = async (categoryData: Omit<Category, 'id'>): Promise<Category> => {
    const hexColor = tailwindToHexMap[categoryData.color] || '#64748b';

    const beData = {
        name: categoryData.name,
        color: hexColor,
        is_foundational: categoryData.isFoundational,
    };

    const response = await fetchWithRetry(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(beData)
    });
    const created = await handleResponse(response);
    return feCategory(created);
};

export const updateCategory = async (category: Category): Promise<Category> => {
    const hexColor = tailwindToHexMap[category.color] || '#64748b';
    const beData = { name: category.name, color: hexColor };

    const response = await fetchWithRetry(`${API_BASE_URL}/categories/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(beData)
    });
    const updated = await handleResponse(response);
    return feCategory(updated);
};

export const deleteCategory = async (categoryId: string, migrationTargetId: string | null): Promise<void> => {
    const body = migrationTargetId ? { migrationTargetId: parseInt(migrationTargetId, 10) } : {};
    const response = await fetchWithRetry(`${API_BASE_URL}/categories/${categoryId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    await handleResponse(response);
};




export const loadInitialData = async (): Promise<void> => {
    const response = await fetchWithRetry(`${API_BASE_URL}/initial-data`, {
        method: 'POST'
    });
    await handleResponse(response);
};




