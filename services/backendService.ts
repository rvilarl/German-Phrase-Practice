// FIX: Removed Omit from import as it's a built-in TypeScript utility type.
import { Phrase, Category } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

// --- Data Conversion Helpers ---

const feCategory = (beCategory: any): Category => ({
    ...beCategory,
    id: beCategory.id.toString(),
});

const fePhrase = (bePhrase: any): Phrase => {
    const categoryId = bePhrase.category_id ?? bePhrase.category;
    return {
        ...bePhrase,
        id: bePhrase.id.toString(),
        category: categoryId.toString(),
    };
};

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
            errorData = JSON.parse(errorText);
        } catch (e) {
            errorData = { error: 'An unknown error occurred', details: errorText };
        }
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }
    if (response.status === 204) {
        return null;
    }
    return response.json();
};

export const fetchInitialData = async (): Promise<{ categories: Category[], phrases: Phrase[] }> => {
    const data = await handleResponse(await fetch(`${API_BASE_URL}/initial-data`));
    return {
        categories: data.categories.map(feCategory),
        phrases: data.phrases.map(fePhrase),
    };
};

export const createPhrase = async (phraseData: Omit<Phrase, 'id' | 'masteryLevel' | 'lastReviewedAt' | 'nextReviewAt' | 'knowCount' | 'knowStreak' | 'isMastered' | 'lapses'>): Promise<Phrase> => {
    const response = await fetch(`${API_BASE_URL}/phrases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            russian: phraseData.russian,
            german: phraseData.german,
            category_id: parseInt(phraseData.category, 10),
        })
    });
    const created = await handleResponse(response);
    const now = Date.now();
    return {
        ...created,
        id: created.id.toString(),
        category: created.category_id.toString(),
        masteryLevel: 0,
        lastReviewedAt: null,
        nextReviewAt: now,
        knowCount: 0,
        knowStreak: 0,
        isMastered: false,
        lapses: 0,
    };
};

export const updatePhrase = async (phrase: Phrase): Promise<Phrase> => {
    const beData = {
        ...phrase,
        category_id: parseInt(phrase.category, 10),
    };
    delete (beData as any).category;
    delete (beData as any).isNew; // Don't send transient frontend state

    const response = await fetch(`${API_BASE_URL}/phrases/${phrase.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(beData)
    });
    const updated = await handleResponse(response);
    return fePhrase({ ...phrase, ...updated });
};

export const deletePhrase = async (phraseId: string): Promise<void> => {
    await handleResponse(await fetch(`${API_BASE_URL}/phrases/${phraseId}`, { method: 'DELETE' }));
};

export const createCategory = async (categoryData: Omit<Category, 'id'>): Promise<Category> => {
    const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
    });
    const created = await handleResponse(response);
    return feCategory(created);
};

export const updateCategory = async (category: Category): Promise<Category> => {
    const response = await fetch(`${API_BASE_URL}/categories/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: category.name, color: category.color })
    });
    const updated = await handleResponse(response);
    return feCategory(updated);
};

export const deleteCategory = async (categoryId: string, migrationTargetId: string | null): Promise<void> => {
    const body = migrationTargetId ? { migrationTargetId: parseInt(migrationTargetId, 10) } : {};
    const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    await handleResponse(response);
};