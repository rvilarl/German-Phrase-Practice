import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// FIX: Import View type from shared types.ts
import { Phrase, DeepDiveAnalysis, MovieExample, WordAnalysis, VerbConjugation, NounDeclension, AdjectiveDeclension, SentenceContinuation, PhraseBuilderOptions, PhraseEvaluation, ChatMessage, PhraseCategory, ProposedCard, BookRecord, Category, CategoryAssistantRequest, CategoryAssistantResponse, View } from './types';
import * as srsService from './services/srsService';
import * as cacheService from './services/cacheService';
import { getProviderPriorityList, getFallbackProvider, ApiProviderType } from './services/apiProvider';
import { AiService } from './services/aiService';
import { initialPhrases as defaultPhrases, foundationalPhrases } from './data/initialPhrases';
import { playCorrectSound, playIncorrectSound } from './services/soundService';

import Header from './components/Header';
import PracticePage from './pages/PracticePage';
import PhraseListPage from './pages/PhraseListPage';
import LibraryPage from './pages/LibraryPage';
import ReaderPage from './pages/ReaderPage';
import ChatModal from './components/ChatModal';
import SettingsModal from './components/SettingsModal';
import DeepDiveModal from './components/DeepDiveModal';
import MovieExamplesModal from './components/MovieExamplesModal';
import WordAnalysisModal from './components/WordAnalysisModal';
import VerbConjugationModal from './components/VerbConjugationModal';
import NounDeclensionModal from './components/NounDeclensionModal';
import AdjectiveDeclensionModal from './components/AdjectiveDeclensionModal';
import SentenceChainModal from './components/SentenceChainModal';
import AddPhraseModal from './components/AddPhraseModal';
import SmartImportModal from './components/SmartImportModal';
import ImprovePhraseModal from './components/ImprovePhraseModal';
import EditPhraseModal from './components/EditPhraseModal';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import VoiceWorkspaceModal from './components/VoiceWorkspaceModal';
import ExpandingFab from './components/ExpandingFab';
import DiscussTranslationModal from './components/DiscussTranslationModal';
import LearningAssistantModal from './components/LearningAssistantModal';
import PronounsModal from './components/PronounsModal';
import WFragenModal from './components/WFragenModal';
import Toast from './components/Toast';
import BugIcon from './components/icons/BugIcon';
import WandIcon from './components/icons/WandIcon';
import MessageQuestionIcon from './components/icons/MessageQuestionIcon';
import CategoryManagerModal from './components/CategoryManagerModal';
import CategoryDetailModal from './components/CategoryDetailModal';
import CategoryFormModal from './components/CategoryFormModal';
import ConfirmDeleteCategoryModal from './components/ConfirmDeleteCategoryModal';
import ConfirmCategoryFillModal from './components/ConfirmCategoryFillModal';
import AutoFillLoadingModal from './components/AutoFillLoadingModal';
import AutoFillPreviewModal from './components/AutoFillPreviewModal';
import MoveOrSkipModal from './components/MoveOrSkipModal';
import CategoryAssistantModal from './components/CategoryAssistantModal';


const PHRASES_STORAGE_KEY = 'germanPhrases';
const SETTINGS_STORAGE_KEY = 'germanAppSettings';
const CATEGORIES_STORAGE_KEY = 'germanAppCategories';
const BUTTON_USAGE_STORAGE_KEY = 'germanAppButtonUsage';
const MASTERY_BUTTON_USAGE_STORAGE_KEY = 'germanAppMasteryButtonUsage';
const HABIT_TRACKER_STORAGE_KEY = 'germanAppHabitTracker';
const CARD_ACTION_USAGE_STORAGE_KEY = 'germanAppCardActionUsage';

// FIX: Removed local View type definition. It's now imported from types.ts
type AnimationDirection = 'left' | 'right';
interface AnimationState {
  key: string;
  direction: AnimationDirection;
}
type ToastType = 'default' | 'automationSuccess';
interface ToastState {
  message: string;
  id: number;
  type: ToastType;
}

const defaultCategories: Category[] = [
    { id: 'general', name: 'Общие', color: 'bg-slate-500', isFoundational: false },
    { id: 'w-fragen', name: 'W-Fragen', color: 'bg-blue-500', isFoundational: true },
    { id: 'pronouns', name: 'Местоимения', color: 'bg-purple-500', isFoundational: true },
    { id: 'numbers', name: 'Цифры', color: 'bg-green-500', isFoundational: true },
    { id: 'time', name: 'Время', color: 'bg-amber-500', isFoundational: true },
    { id: 'money', name: 'Деньги', color: 'bg-emerald-500', isFoundational: true },
];

const defaultSettings = {
  autoSpeak: true,
  soundEffects: true,
  automation: {
    autoCheckShortPhrases: true,
    learnNextPhraseHabit: true,
  },
  enabledCategories: defaultCategories.reduce((acc, cat) => {
    acc[cat.id] = true;
    return acc;
  }, {} as Record<PhraseCategory, boolean>),
};

const defaultHabitTracker = { 
    quickNextCount: 0, 
    quickBuilderNextCount: 0 
};

const defaultCardActionUsage = {
    learningAssistant: 0,
    sentenceChain: 0,
    phraseBuilder: 0,
    chat: 0,
    deepDive: 0,
    movieExamples: 0,
};

// Helper function for retrying API calls with a delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface LeechModalProps {
  isOpen: boolean;
  phrase: Phrase;
  onImprove: (phrase: Phrase) => void;
  onDiscuss: (phrase: Phrase) => void;
  onContinue: (phrase: Phrase) => void;
  onReset: (phrase: Phrase) => void;
  onPostpone: (phrase: Phrase) => void;
}

const LeechModal: React.FC<LeechModalProps> = ({ isOpen, phrase, onImprove, onDiscuss, onContinue, onReset, onPostpone }) => {
  if (!isOpen) return null;

  const handleImprove = () => onImprove(phrase);
  const handleDiscuss = () => onDiscuss(phrase);
  const handleContinue = () => onContinue(phrase);
  const handleReset = () => onReset(phrase);
  const handlePostpone = () => onPostpone(phrase);

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center backdrop-blur-sm p-4 animate-fade-in" 
      onClick={handlePostpone} // Default action on backdrop click is to postpone
    >
      <div
        className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-sm m-4 p-6 text-center"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-amber-900/50 flex items-center justify-center">
            <BugIcon className="w-6 h-6 text-amber-500" />
          </div>
        </div>
        
        <h2 className="text-xl font-bold text-slate-100">Сложная фраза</h2>
        <p className="text-slate-400 mt-2 mb-4">Эта фраза дается вам с трудом. Что с ней сделать?</p>
        
        <div className="bg-slate-700/50 p-4 rounded-md text-center mb-6">
            <p className="text-slate-200 font-medium text-lg">"{phrase.russian}"</p>
            <p className="text-slate-400 mt-1">"{phrase.german}"</p>
        </div>

        <div className="flex flex-col space-y-3">
           <button 
            onClick={handleImprove} 
            className="w-full px-6 py-3 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors flex items-center justify-center"
          >
            <WandIcon className="w-5 h-5 mr-2" />
            <span>Улучшить фразу</span>
          </button>
           <button 
            onClick={handleDiscuss} 
            className="w-full px-6 py-3 rounded-md bg-slate-600 hover:bg-slate-700 text-white font-semibold transition-colors flex items-center justify-center"
          >
            <MessageQuestionIcon className="w-5 h-5 mr-2" />
            <span>Обсудить с AI</span>
          </button>
          <div className="pt-3 mt-3 border-t border-slate-700 space-y-3">
            <button onClick={handleContinue} className="w-full px-6 py-2 rounded-md bg-transparent hover:bg-slate-700/50 text-slate-300 font-medium transition-colors">Повторить через 10 мин</button>
            <button onClick={handleReset} className="w-full px-6 py-2 rounded-md bg-transparent hover:bg-slate-700/50 text-slate-300 font-medium transition-colors">Сбросить прогресс</button>
            <button onClick={handlePostpone} className="w-full px-6 py-2 rounded-md bg-transparent hover:bg-slate-700/50 text-slate-300 font-medium transition-colors">Отложить на завтра</button>
          </div>
        </div>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [allPhrases, setAllPhrases] = useState<Phrase[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('practice');
  const [highlightedPhraseId, setHighlightedPhraseId] = useState<string | null>(null);
  const [activeBookId, setActiveBookId] = useState<number | null>(null);
  
  // --- State Lifted from PracticePage ---
  const [currentPracticePhrase, setCurrentPracticePhrase] = useState<Phrase | null>(null);
  const [isPracticeAnswerRevealed, setIsPracticeAnswerRevealed] = useState(false);
  const [practiceCardEvaluated, setPracticeCardEvaluated] = useState(false);
  const [practiceAnimationState, setPracticeAnimationState] = useState<AnimationState>({ key: '', direction: 'right' });
  const [cardHistory, setCardHistory] = useState<string[]>([]);
  const [practiceCategoryFilter, setPracticeCategoryFilter] = useState<'all' | PhraseCategory>('all');
  const practiceIsExitingRef = useRef(false);
  const specificPhraseRequestedRef = useRef(false);
  // --- End State Lift ---

  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatContextPhrase, setChatContextPhrase] = useState<Phrase | null>(null);
  
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [buttonUsage, setButtonUsage] = useState({ close: 0, continue: 0, next: 0 });
  const [masteryButtonUsage, setMasteryButtonUsage] = useState({ know: 0, forgot: 0, dont_know: 0 });
  const [habitTracker, setHabitTracker] = useState(defaultHabitTracker);
  const [cardActionUsage, setCardActionUsage] = useState(defaultCardActionUsage);
  
  const [toast, setToast] = useState<ToastState | null>(null);

  const [isDeepDiveModalOpen, setIsDeepDiveModalOpen] = useState(false);
  const [deepDivePhrase, setDeepDivePhrase] = useState<Phrase | null>(null);
  const [deepDiveAnalysis, setDeepDiveAnalysis] = useState<DeepDiveAnalysis | null>(null);
  const [isDeepDiveLoading, setIsDeepDiveLoading] = useState<boolean>(false);
  const [deepDiveError, setDeepDiveError] = useState<string | null>(null);

  const [isMovieExamplesModalOpen, setIsMovieExamplesModalOpen] = useState(false);
  const [movieExamplesPhrase, setMovieExamplesPhrase] = useState<Phrase | null>(null);
  const [movieExamples, setMovieExamples] = useState<MovieExample[]>([]);
  const [isMovieExamplesLoading, setIsMovieExamplesLoading] = useState<boolean>(false);
  const [movieExamplesError, setMovieExamplesError] = useState<string | null>(null);

  const [isWordAnalysisModalOpen, setIsWordAnalysisModalOpen] = useState(false);
  const [wordAnalysisPhrase, setWordAnalysisPhrase] = useState<Phrase | null>(null);
  const [selectedWord, setSelectedWord] = useState<string>('');
  const [wordAnalysis, setWordAnalysis] = useState<WordAnalysis | null>(null);
  const [isWordAnalysisLoading, setIsWordAnalysisLoading] = useState<boolean>(false);
  const [wordAnalysisError, setWordAnalysisError] = useState<string | null>(null);

  const [isVerbConjugationModalOpen, setIsVerbConjugationModalOpen] = useState(false);
  const [verbConjugationData, setVerbConjugationData] = useState<VerbConjugation | null>(null);
  const [isVerbConjugationLoading, setIsVerbConjugationLoading] = useState<boolean>(false);
  const [verbConjugationError, setVerbConjugationError] = useState<string | null>(null);
  const [conjugationVerb, setConjugationVerb] = useState<string>('');

  const [isNounDeclensionModalOpen, setIsNounDeclensionModalOpen] = useState(false);
  const [nounDeclensionData, setNounDeclensionData] = useState<NounDeclension | null>(null);
  const [isNounDeclensionLoading, setIsNounDeclensionLoading] = useState<boolean>(false);
  const [nounDeclensionError, setNounDeclensionError] = useState<string | null>(null);
  const [declensionNoun, setDeclensionNoun] = useState<{ noun: string; article: string } | null>(null);

  const [isAdjectiveDeclensionModalOpen, setIsAdjectiveDeclensionModalOpen] = useState(false);
  const [adjectiveDeclensionData, setAdjectiveDeclensionData] = useState<AdjectiveDeclension | null>(null);
  const [isAdjectiveDeclensionLoading, setIsAdjectiveDeclensionLoading] = useState<boolean>(false);
  const [adjectiveDeclensionError, setAdjectiveDeclensionError] = useState<string | null>(null);
  const [declensionAdjective, setDeclensionAdjective] = useState<string>('');

  const [isSentenceChainModalOpen, setIsSentenceChainModalOpen] = useState(false);
  const [sentenceChainPhrase, setSentenceChainPhrase] = useState<Phrase | null>(null);
  
  const [isAddPhraseModalOpen, setIsAddPhraseModalOpen] = useState(false);
  const [addPhraseConfig, setAddPhraseConfig] = useState({ language: 'ru' as 'ru' | 'de', autoSubmit: true });

  const [isSmartImportModalOpen, setIsSmartImportModalOpen] = useState(false);
  const [smartImportInitialTopic, setSmartImportInitialTopic] = useState<string | undefined>();

  const [isImproveModalOpen, setIsImproveModalOpen] = useState(false);
  const [phraseToImprove, setPhraseToImprove] = useState<Phrase | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [phraseToEdit, setPhraseToEdit] = useState<Phrase | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [phraseToDelete, setPhraseToDelete] = useState<Phrase | null>(null);

  const [isVoiceWorkspaceModalOpen, setIsVoiceWorkspaceModalOpen] = useState(false);
  const [voiceWorkspacePhrase, setVoiceWorkspacePhrase] = useState<Phrase | null>(null);
  
  const [isLearningAssistantModalOpen, setIsLearningAssistantModalOpen] = useState(false);
  const [learningAssistantPhrase, setLearningAssistantPhrase] = useState<Phrase | null>(null);
  const [learningAssistantCache, setLearningAssistantCache] = useState<{ [phraseId: string]: ChatMessage[] }>({});

  const [apiProvider, setApiProvider] = useState<AiService | null>(null);
  const [apiProviderType, setApiProviderType] = useState<ApiProviderType | null>(null);
  
  const [isDiscussModalOpen, setIsDiscussModalOpen] = useState(false);
  const [phraseToDiscuss, setPhraseToDiscuss] = useState<Phrase | null>(null);
  const [discussInitialMessage, setDiscussInitialMessage] = useState<string | undefined>();
  
  const [isPronounsModalOpen, setIsPronounsModalOpen] = useState(false);
  const [isWFragenModalOpen, setIsWFragenModalOpen] = useState(false);
  
  const [isLeechModalOpen, setIsLeechModalOpen] = useState(false);
  const [leechPhrase, setLeechPhrase] = useState<Phrase | null>(null);

  const [isCategoryManagerModalOpen, setIsCategoryManagerModalOpen] = useState(false);
  const [categoryToView, setCategoryToView] = useState<Category | null>(null);
  const [isCategoryFormModalOpen, setIsCategoryFormModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  
  // New state for auto-fill flow
  const [categoryToAutoFill, setCategoryToAutoFill] = useState<Category | null>(null);
  const [autoFillingCategory, setAutoFillingCategory] = useState<Category | null>(null);
  const [isAutoFillPreviewOpen, setIsAutoFillPreviewOpen] = useState(false);
  const [proposedCardsForFill, setProposedCardsForFill] = useState<ProposedCard[]>([]);
  const [isRefining, setIsRefining] = useState(false);
  
  // New state for duplicate review flow
  const [isMoveOrSkipModalOpen, setIsMoveOrSkipModalOpen] = useState(false);
  const [duplicatesReviewData, setDuplicatesReviewData] = useState<{
    duplicates: { existingPhrase: Phrase; proposedCard: ProposedCard }[];
    newCards: ProposedCard[];
    targetCategory: Category;
  } | null>(null);

  // New state for Category Assistant
  const [assistantCache, setAssistantCache] = useState<{ [categoryId: string]: ChatMessage[] }>({});
  const [isCategoryAssistantModalOpen, setIsCategoryAssistantModalOpen] = useState(false);
  const [assistantCategory, setAssistantCategory] = useState<Category | null>(null);
  
  const isPrefetchingRef = useRef(false);
  const isQuickReplyPrefetchingRef = useRef(false);


  useEffect(() => {
    const initializeApp = async () => {
        setIsLoading(true);
        setError(null);

        const providerList = getProviderPriorityList();
        let activeProvider: AiService | null = null;
        let activeProviderType: ApiProviderType | null = null;

        if (providerList.length === 0) {
            setError("No AI provider configured. Please check your API keys.");
        } else {
            for (const providerInfo of providerList) {
                const isHealthy = await providerInfo.provider.healthCheck();
                if (isHealthy) {
                    activeProvider = providerInfo.provider;
                    activeProviderType = providerInfo.type;
                    break; 
                }
            }
        }

        if (activeProvider) {
            setApiProvider(activeProvider);
            setApiProviderType(activeProviderType);
        } else if (providerList.length > 0) {
            setError("AI features are temporarily unavailable. All configured providers failed health checks.");
        }

        let loadedCategories: Category[] = [];
        try {
            const storedCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY);
            if (storedCategories) {
                loadedCategories = JSON.parse(storedCategories);
            }
        } catch (e) {
            console.error("Failed to load/parse categories, clearing invalid data.", e);
            localStorage.removeItem(CATEGORIES_STORAGE_KEY);
        }

        if (loadedCategories.length === 0) {
            loadedCategories = defaultCategories;
            localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(loadedCategories));
        }
        setCategories(loadedCategories);


        try {
            const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (storedSettings) {
                const parsedSettings = JSON.parse(storedSettings);
                 // Ensure enabledCategories is in sync with loadedCategories
                const enabledCategories = { ...defaultSettings.enabledCategories, ...parsedSettings.enabledCategories };
                for (const category of loadedCategories) {
                    if (!(category.id in enabledCategories)) {
                        enabledCategories[category.id] = true;
                    }
                }
                setSettings(prev => ({
                    ...defaultSettings,
                    ...prev,
                    ...parsedSettings,
                    automation: { ...defaultSettings.automation, ...parsedSettings.automation },
                    enabledCategories,
                }));
            }
            const storedUsage = localStorage.getItem(BUTTON_USAGE_STORAGE_KEY);
            if (storedUsage) setButtonUsage(JSON.parse(storedUsage));

            const storedMasteryUsage = localStorage.getItem(MASTERY_BUTTON_USAGE_STORAGE_KEY);
            if (storedMasteryUsage) setMasteryButtonUsage(JSON.parse(storedMasteryUsage));

            const storedCardActionUsage = localStorage.getItem(CARD_ACTION_USAGE_STORAGE_KEY);
            if(storedCardActionUsage) setCardActionUsage(prev => ({ ...defaultCardActionUsage, ...prev, ...JSON.parse(storedCardActionUsage) }));

            const storedHabitTracker = localStorage.getItem(HABIT_TRACKER_STORAGE_KEY);
            if (storedHabitTracker) {
                const parsedTracker = JSON.parse(storedHabitTracker);
                setHabitTracker(prev => ({ ...defaultHabitTracker, ...prev, ...parsedTracker }));
            }

        } catch (e) { console.error("Failed to load settings", e); }

        let loadedPhrases: Phrase[] = [];
        try {
            const storedPhrases = localStorage.getItem(PHRASES_STORAGE_KEY);
            if (storedPhrases) {
                const parsedData = JSON.parse(storedPhrases);
                if (Array.isArray(parsedData)) {
                    loadedPhrases = parsedData
                        .filter((p): p is Partial<Phrase> => p && typeof p === 'object' && 'german' in p && 'russian' in p)
                        .map(p => {
                            const phraseBase = {
                                russian: p.russian!,
                                german: p.german!,
                                transcription: p.transcription,
                                context: p.context,
                                knowCount: p.knowCount ?? 0,
                                knowStreak: p.knowStreak ?? 0,
                                masteryLevel: p.masteryLevel ?? 0,
                                lastReviewedAt: p.lastReviewedAt ?? null,
                                nextReviewAt: p.nextReviewAt ?? Date.now(),
                                lapses: p.lapses ?? 0,
                                isMastered: false,
                            };
                            
                            const category = p.category || srsService.assignInitialCategory(phraseBase);
                        
                            const fullPhraseObject = {
                                ...phraseBase,
                                id: p.id ?? Math.random().toString(36).substring(2, 9),
                                category,
                                isNew: p.isNew,
                            };
                        
                            return {
                                ...fullPhraseObject,
                                isMastered: srsService.isPhraseMastered(fullPhraseObject, loadedCategories),
                            };
                        });
                }
            }
        } catch (e) {
            console.error("Failed to load/parse phrases, clearing invalid data.", e);
            localStorage.removeItem(PHRASES_STORAGE_KEY);
        }

        if (loadedPhrases.length === 0) {
            loadedPhrases = defaultPhrases.map(p => ({
                ...p,
                id: Math.random().toString(36).substring(2, 9),
            }));
        } else {
            // Check for and add any missing foundational phrases for existing users.
            const foundationalCategoriesIds = loadedCategories.filter(c => c.isFoundational).map(c => c.id);
            
            const existingGermanFoundational = new Set(
                loadedPhrases
                    .filter(p => foundationalCategoriesIds.includes(p.category))
                    .map(p => p.german.trim().toLowerCase())
            );

            const missingFoundational = foundationalPhrases.filter(
                p => !existingGermanFoundational.has(p.german.trim().toLowerCase())
            );

            if (missingFoundational.length > 0) {
                console.log(`Adding ${missingFoundational.length} missing foundational phrases.`);
                const phrasesToAdd: Phrase[] = missingFoundational.map(p => ({
                    ...p,
                    id: Math.random().toString(36).substring(2, 9),
                }));
                // Prepend new phrases so they appear first in the "new" section of the list
                loadedPhrases = [...phrasesToAdd, ...loadedPhrases];
            }
        }
        
        // Persist any changes made during initialization (e.g., adding missing phrases)
        // This ensures the check only runs once if phrases were missing.
        localStorage.setItem(PHRASES_STORAGE_KEY, JSON.stringify(loadedPhrases));
        
        setAllPhrases(loadedPhrases);
        setIsLoading(false);
    };

    initializeApp();
  }, []);

  const callApiWithFallback = useCallback(async <T,>(
    apiCall: (provider: AiService) => Promise<T>
  ): Promise<T> => {
    if (!apiProvider || !apiProviderType) throw new Error("AI provider not initialized.");

    const maxRetries = 3;
    
    const executeWithRetries = async (provider: AiService, type: ApiProviderType): Promise<T> => {
        let attempt = 0;
        let delay = 1000; // 1s initial delay
        while (attempt < maxRetries) {
            try {
                return await apiCall(provider);
            } catch (error: any) {
                attempt++;
                let isRateLimitError = false;

                if (type === 'gemini') {
                    try {
                        const message = error.message || '';
                        const jsonMatch = message.match(/{.*}/s);
                        if (jsonMatch) {
                            const errorJson = JSON.parse(jsonMatch[0]);
                            if (errorJson?.error?.code === 429 || errorJson?.error?.status === 'RESOURCE_EXHAUSTED') {
                                isRateLimitError = true;
                            }
                        } else if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
                            isRateLimitError = true;
                        }
                    } catch (e) {
                        if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
                           isRateLimitError = true;
                        }
                    }
                }
                
                if (isRateLimitError && attempt < maxRetries) {
                    const jitter = Math.random() * 500;
                    console.warn(`Rate limit exceeded on attempt ${attempt} with ${type}. Retrying in ${(delay + jitter) / 1000}s...`);
                    await sleep(delay + jitter);
                    delay *= 2; // Exponential backoff
                } else {
                    throw error;
                }
            }
        }
        throw new Error(`API call failed with ${type} after ${maxRetries} attempts.`);
    };

    try {
        return await executeWithRetries(apiProvider, apiProviderType);
    } catch (primaryError) {
        console.warn(`API call with ${apiProviderType} failed:`, primaryError);
        const fallback = getFallbackProvider(apiProviderType);
        if (fallback) {
            console.log(`Attempting fallback to ${fallback.type}...`);
            setApiProvider(fallback.provider);
            setApiProviderType(fallback.type);
            try {
                return await executeWithRetries(fallback.provider, fallback.type);
            } catch (fallbackError) {
                console.error(`Fallback API call with ${fallback.type} also failed:`, fallbackError);
                 throw new Error(`Primary API failed: ${(primaryError as Error).message}. Fallback API also failed: ${(fallbackError as Error).message}`);
            }
        }
        throw primaryError;
    }
  }, [apiProvider, apiProviderType]);

  const updateAndSavePhrases = useCallback((updater: React.SetStateAction<Phrase[]>) => {
    setAllPhrases(prevPhrases => {
        const newPhrases = typeof updater === 'function' ? updater(prevPhrases) : updater;
        try {
            localStorage.setItem(PHRASES_STORAGE_KEY, JSON.stringify(newPhrases));
        } catch (e) { console.error("Failed to save phrases to storage", e); }
        return newPhrases;
    });
  }, []);

  const updateAndSaveCategories = useCallback((updater: React.SetStateAction<Category[]>) => {
    setCategories(prev => {
        const newCategories = typeof updater === 'function' ? updater(prev) : updater;
        localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(newCategories));
        return newCategories;
    });
  }, []);
  
  const handleSettingsChange = (newSettings: Partial<typeof settings>) => {
    setSettings(prev => {
        const updated = { ...prev, ...newSettings };
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
        return updated;
    });
  }

  const handleHabitTrackerChange = useCallback((updater: React.SetStateAction<typeof habitTracker>) => {
    setHabitTracker(prev => {
        const newTracker = typeof updater === 'function' ? updater(prev) : updater;
        localStorage.setItem(HABIT_TRACKER_STORAGE_KEY, JSON.stringify(newTracker));
        return newTracker;
    });
  }, []);

  const showToast = useCallback((config: { message: string; type?: ToastType }) => {
    setToast({ message: config.message, type: config.type || 'default', id: Date.now() });
  }, []);

  const handleLogButtonUsage = useCallback((button: 'close' | 'continue' | 'next') => {
    const DECAY_FACTOR = 0.95;
    const INCREMENT = 1;
    setButtonUsage(prev => {
        const newUsage = {
            close: prev.close * DECAY_FACTOR,
            continue: prev.continue * DECAY_FACTOR,
            next: prev.next * DECAY_FACTOR,
        };
        newUsage[button] += INCREMENT;
        localStorage.setItem(BUTTON_USAGE_STORAGE_KEY, JSON.stringify(newUsage));
        return newUsage;
    });
  }, []);

  const handleLogMasteryButtonUsage = useCallback((button: 'know' | 'forgot' | 'dont_know') => {
    const DECAY_FACTOR = 0.95;
    const INCREMENT = 1;
    setMasteryButtonUsage(prev => {
        const newUsage = {
            know: prev.know * DECAY_FACTOR,
            forgot: prev.forgot * DECAY_FACTOR,
            dont_know: prev.dont_know * DECAY_FACTOR,
        };
        newUsage[button] += INCREMENT;
        localStorage.setItem(MASTERY_BUTTON_USAGE_STORAGE_KEY, JSON.stringify(newUsage));
        return newUsage;
    });
  }, []);

  const handleLogCardActionUsage = useCallback((button: keyof typeof cardActionUsage) => {
    const DECAY_FACTOR = 0.95;
    const INCREMENT = 1;
    setCardActionUsage(prev => {
        const newUsage = { ...prev };
        for (const key in newUsage) {
            (newUsage as any)[key] *= DECAY_FACTOR;
        }
        newUsage[button] += INCREMENT;
        localStorage.setItem(CARD_ACTION_USAGE_STORAGE_KEY, JSON.stringify(newUsage));
        return newUsage;
    });
  }, []);
  
  const fetchNewPhrases = useCallback(async (count: number = 5) => {
    if (isGenerating || !apiProvider) {
        if (!apiProvider) setError("AI provider is not available for generating new phrases.");
        return;
    };
    setIsGenerating(true);
    if (!error?.includes("AI features are temporarily unavailable")) setError(null);
    try {
        const existingGermanPhrases = allPhrases.map(p => p.german).join('; ');
        const prompt = `Сгенерируй ${count} новых, полезных в быту немецких фраз уровня A1. Не повторяй: "${existingGermanPhrases}". Верни JSON-массив объектов с ключами 'german' и 'russian'.`;
        const newPhrases = await callApiWithFallback(provider => provider.generatePhrases(prompt));
        
        const now = Date.now();
        const phrasesToAdd: Phrase[] = newPhrases.map(p => ({
            ...p,
            id: Math.random().toString(36).substring(2, 9), masteryLevel: 0, lastReviewedAt: null, nextReviewAt: now,
            knowCount: 0, knowStreak: 0, isMastered: false, category: 'general', lapses: 0,
        }));
        updateAndSavePhrases(prev => [...prev, ...phrasesToAdd]);
        
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error during phrase generation.');
    } finally {
      setIsGenerating(false);
    }
  }, [allPhrases, isGenerating, updateAndSavePhrases, callApiWithFallback, apiProvider, error]);

  const openChatForPhrase = (phrase: Phrase) => {
    if (!apiProvider) return;
    setChatContextPhrase(phrase);
    setIsChatModalOpen(true);
  };

  const handleOpenDeepDive = useCallback(async (phrase: Phrase) => {
    if (!apiProvider) return;
    setDeepDivePhrase(phrase);
    setIsDeepDiveModalOpen(true);
    setIsDeepDiveLoading(true);
    setDeepDiveAnalysis(null);
    setDeepDiveError(null);
    const cacheKey = `deep_dive_${phrase.id}`;
    const cachedAnalysis = cacheService.getCache<DeepDiveAnalysis>(cacheKey);
    if (cachedAnalysis) {
      setDeepDiveAnalysis(cachedAnalysis);
      setIsDeepDiveLoading(false);
      return;
    }
    try {
      const analysis = await callApiWithFallback(provider => provider.generateDeepDiveAnalysis(phrase));
      setDeepDiveAnalysis(analysis);
      cacheService.setCache(cacheKey, analysis);
    } catch (err) {
      setDeepDiveError(err instanceof Error ? err.message : 'Unknown error during analysis generation.');
    } finally {
      setIsDeepDiveLoading(false);
    }
  }, [callApiWithFallback, apiProvider]);

  const handleOpenMovieExamples = useCallback(async (phrase: Phrase) => {
    if (!apiProvider) return;
    setMovieExamplesPhrase(phrase);
    setIsMovieExamplesModalOpen(true);
    setIsMovieExamplesLoading(true);
    setMovieExamples([]);
    setMovieExamplesError(null);
    const cacheKey = `movie_examples_${phrase.id}`;
    const cachedExamples = cacheService.getCache<MovieExample[]>(cacheKey);
    if (cachedExamples) {
      setMovieExamples(cachedExamples);
      setIsMovieExamplesLoading(false);
      return;
    }
    try {
      const examples = await callApiWithFallback(provider => provider.generateMovieExamples(phrase));
      setMovieExamples(examples);
      cacheService.setCache(cacheKey, examples);
    } catch (err) {
      setMovieExamplesError(err instanceof Error ? err.message : 'Unknown error during example generation.');
    } finally {
      setIsMovieExamplesLoading(false);
    }
  }, [callApiWithFallback, apiProvider]);

  const analyzeWord = useCallback(async (phrase: Phrase, word: string): Promise<WordAnalysis | null> => {
    if (!apiProvider) return null;
    const cacheKey = `word_analysis_${phrase.id}_${word.toLowerCase()}`;
    const cachedAnalysis = cacheService.getCache<WordAnalysis>(cacheKey);
    if (cachedAnalysis) return cachedAnalysis;

    try {
        const analysis = await callApiWithFallback(provider => provider.analyzeWordInPhrase(phrase, word));
        cacheService.setCache(cacheKey, analysis);
        return analysis;
    } catch (err) {
        console.error("Error analyzing word:", err);
        return null;
    }
  }, [callApiWithFallback, apiProvider]);
  
  const handleOpenWordAnalysis = useCallback(async (phrase: Phrase, word: string) => {
    if (isWordAnalysisLoading) return;
    setWordAnalysisPhrase(phrase);
    setSelectedWord(word);
    setIsWordAnalysisModalOpen(true);
    setIsWordAnalysisLoading(true);
    setWordAnalysis(null);
    setWordAnalysisError(null);
    
    const analysisResult = await analyzeWord(phrase, word);
    if (analysisResult) {
        setWordAnalysis(analysisResult);
    } else {
        setWordAnalysisError('Unknown error during word analysis.');
    }
    setIsWordAnalysisLoading(false);
  }, [analyzeWord, isWordAnalysisLoading]);

  const handleOpenVerbConjugation = useCallback(async (infinitive: string) => {
    if (!apiProvider) return;
    setConjugationVerb(infinitive);
    setIsVerbConjugationModalOpen(true);
    setIsVerbConjugationLoading(true);
    setVerbConjugationData(null);
    setVerbConjugationError(null);
    const cacheKey = `verb_conjugation_${infinitive}`;
    const cachedData = cacheService.getCache<VerbConjugation>(cacheKey);
    if (cachedData) {
        setVerbConjugationData(cachedData);
        setIsVerbConjugationLoading(false);
        return;
    }
    try {
        const data = await callApiWithFallback(provider => provider.conjugateVerb(infinitive));
        setVerbConjugationData(data);
        cacheService.setCache(cacheKey, data);
    } catch (err) {
        setVerbConjugationError(err instanceof Error ? err.message : 'Unknown error during conjugation generation.');
    } finally {
        setIsVerbConjugationLoading(false);
    }
  }, [apiProvider, callApiWithFallback]);

  const handleOpenNounDeclension = useCallback(async (noun: string, article: string) => {
    if (!apiProvider) return;
    setDeclensionNoun({ noun, article });
    setIsNounDeclensionModalOpen(true);
    setIsNounDeclensionLoading(true);
    setNounDeclensionData(null);
    setNounDeclensionError(null);
    const cacheKey = `noun_declension_${article}_${noun}`;
    const cachedData = cacheService.getCache<NounDeclension>(cacheKey);
    if (cachedData) {
        setNounDeclensionData(cachedData);
        setIsNounDeclensionLoading(false);
        return;
    }
    try {
        const data = await callApiWithFallback(provider => provider.declineNoun(noun, article));
        setNounDeclensionData(data);
        cacheService.setCache(cacheKey, data);
    } catch (err) {
        setNounDeclensionError(err instanceof Error ? err.message : 'Unknown error during declension generation.');
    } finally {
        setIsNounDeclensionLoading(false);
    }
  }, [apiProvider, callApiWithFallback]);
  
  const handleOpenAdjectiveDeclension = useCallback(async (adjective: string) => {
    if (!apiProvider) return;
    setDeclensionAdjective(adjective);
    setIsAdjectiveDeclensionModalOpen(true);
    setIsAdjectiveDeclensionLoading(true);
    setAdjectiveDeclensionData(null);
    setAdjectiveDeclensionError(null);
    const cacheKey = `adj_declension_${adjective}`;
    const cachedData = cacheService.getCache<AdjectiveDeclension>(cacheKey);
    if (cachedData) {
        setAdjectiveDeclensionData(cachedData);
        setIsAdjectiveDeclensionLoading(false);
        return;
    }
    try {
        const data = await callApiWithFallback(provider => provider.declineAdjective(adjective));
        setAdjectiveDeclensionData(data);
        cacheService.setCache(cacheKey, data);
    } catch (err) {
        setAdjectiveDeclensionError(err instanceof Error ? err.message : 'Unknown error during adjective declension generation.');
    } finally {
        setIsAdjectiveDeclensionLoading(false);
    }
  }, [apiProvider, callApiWithFallback]);

  const handleOpenSentenceChain = (phrase: Phrase) => {
    if (!apiProvider) return;
    setSentenceChainPhrase(phrase);
    setIsSentenceChainModalOpen(true);
  };
  
  const prefetchPhraseBuilderOptions = useCallback(async (startingPhraseId: string | null) => {
    if (isPrefetchingRef.current || !apiProvider) return;
    isPrefetchingRef.current = true;

    try {
        const PREFETCH_COUNT = 2;
        let nextPhraseId = startingPhraseId;
        const phrasesToFetch: Phrase[] = [];
        const unmastered = allPhrases.filter(p => p && !p.isMastered);

        for (let i = 0; i < PREFETCH_COUNT; i++) {
            const nextPhrase = srsService.selectNextPhrase(unmastered, nextPhraseId);
            if (nextPhrase) {
                if (phrasesToFetch.some(p => p.id === nextPhrase.id)) break;
                phrasesToFetch.push(nextPhrase);
                nextPhraseId = nextPhrase.id;
            } else {
                break;
            }
        }
        
        await Promise.all(phrasesToFetch.map(async (phrase) => {
            const cacheKey = `phrase_builder_${phrase.id}`;
            if (!cacheService.getCache<PhraseBuilderOptions>(cacheKey)) {
                try {
                    const options = await callApiWithFallback(provider => provider.generatePhraseBuilderOptions(phrase));
                    cacheService.setCache(cacheKey, options);
                } catch (err) {
                    console.warn(`Background prefetch failed for phrase ${phrase.id}:`, err);
                }
            }
        }));
    } finally {
        isPrefetchingRef.current = false;
    }
  }, [allPhrases, callApiWithFallback, apiProvider]);

  const prefetchQuickReplyOptions = useCallback(async (startingPhraseId: string | null) => {
    if (isQuickReplyPrefetchingRef.current || !apiProvider) return;
    isQuickReplyPrefetchingRef.current = true;

    try {
        const PREFETCH_COUNT = 5; // Increased prefetch count
        let nextPhraseId = startingPhraseId;
        const phrasesToFetch: Phrase[] = [];
        const unmastered = allPhrases.filter(p => p && !p.isMastered && settings.enabledCategories[p.category]);

        for (let i = 0; i < PREFETCH_COUNT; i++) {
            const nextPhrase = srsService.selectNextPhrase(unmastered, nextPhraseId);
            if (nextPhrase) {
                if (phrasesToFetch.some(p => p.id === nextPhrase.id)) break;

                // Only prefetch for 'general' phrases, as others are generated locally and instantly.
                if (nextPhrase.category === 'general') {
                    phrasesToFetch.push(nextPhrase);
                }
                
                nextPhraseId = nextPhrase.id;
            } else {
                break;
            }
        }
        
        if (phrasesToFetch.length > 0) {
            await Promise.all(phrasesToFetch.map(async (phrase) => {
                const cacheKey = `quick_reply_options_${phrase.id}`;
                if (!cacheService.getCache<string[]>(cacheKey)) {
                    try {
                        const result = await callApiWithFallback(provider => provider.generateQuickReplyOptions(phrase));
                        if (result.options && result.options.length > 0) {
                            cacheService.setCache(cacheKey, result.options);
                        }
                    } catch (err) {
                        console.warn(`Background prefetch for quick reply options failed for phrase ${phrase.id}:`, err);
                    }
                }
            }));
        }
    } finally {
        isQuickReplyPrefetchingRef.current = false;
    }
  }, [allPhrases, callApiWithFallback, apiProvider, settings.enabledCategories]);
  
  // New proactive pre-fetching effect for both phrase builder and quick replies
  useEffect(() => {
    if (view === 'practice' && currentPracticePhrase) {
        prefetchPhraseBuilderOptions(currentPracticePhrase.id);
        prefetchQuickReplyOptions(currentPracticePhrase.id);
    }
  }, [view, currentPracticePhrase, prefetchPhraseBuilderOptions, prefetchQuickReplyOptions]);


  const handleOpenVoiceWorkspace = (phrase: Phrase) => {
    if (!apiProvider) return;
    setVoiceWorkspacePhrase(phrase);
    setIsVoiceWorkspaceModalOpen(true);
  }

  const handleEvaluatePhraseAttempt = useCallback((phrase: Phrase, userAttempt: string): Promise<PhraseEvaluation> => {
    return callApiWithFallback(provider => provider.evaluatePhraseAttempt(phrase, userAttempt));
  }, [callApiWithFallback]);
  
  const handleEvaluateSpokenPhraseAttempt = useCallback((phrase: Phrase, userAttempt: string): Promise<PhraseEvaluation> => {
    return callApiWithFallback(provider => provider.evaluateSpokenPhraseAttempt(phrase, userAttempt));
  }, [callApiWithFallback]);
  
  const updatePhraseMasteryAndCache = useCallback((phrase: Phrase, action: 'know' | 'forgot' | 'dont_know') => {
    const updatedPhrase = srsService.updatePhraseMastery(phrase, action, categories);
    updateAndSavePhrases(prev =>
        prev.map(p => (p.id === phrase.id ? updatedPhrase : p))
    );

    if (updatedPhrase.isMastered && !phrase.isMastered) {
        cacheService.clearCacheForPhrase(phrase.id);
    }
    
    return updatedPhrase;
  }, [updateAndSavePhrases, categories]);


  const handlePhraseActionSuccess = useCallback((phrase: Phrase) => {
    if (settings.soundEffects) playCorrectSound();
    updatePhraseMasteryAndCache(phrase, 'know');
  }, [settings.soundEffects, updatePhraseMasteryAndCache]);

  const handlePhraseActionFailure = useCallback((phrase: Phrase) => {
    if (settings.soundEffects) playIncorrectSound();
    updatePhraseMasteryAndCache(phrase, 'forgot');
  }, [settings.soundEffects, updatePhraseMasteryAndCache]);


  const handleGenerateContinuations = useCallback((russianPhrase: string) => callApiWithFallback(provider => provider.generateSentenceContinuations(russianPhrase)),[callApiWithFallback]);
  const handleGenerateInitialExamples = useCallback((phrase: Phrase) => callApiWithFallback(provider => provider.generateInitialExamples(phrase)),[callApiWithFallback]);
  const handleContinueChat = useCallback((phrase: Phrase, history: any[], newMessage: string) => callApiWithFallback(provider => provider.continueChat(phrase, history, newMessage)),[callApiWithFallback]);
  const handleGenerateQuickReplyOptions = useCallback((phrase: Phrase) => callApiWithFallback(provider => provider.generateQuickReplyOptions(phrase)),[callApiWithFallback]);
  const handleGuideToTranslation = useCallback((phrase: Phrase, history: ChatMessage[], userAnswer: string) => callApiWithFallback(provider => provider.guideToTranslation(phrase, history, userAnswer)),[callApiWithFallback]);
  const handleGenerateSinglePhrase = useCallback((russianPhrase: string) => callApiWithFallback(provider => provider.generateSinglePhrase(russianPhrase)),[callApiWithFallback]);
  const handleTranslateGermanToRussian = useCallback((germanPhrase: string) => callApiWithFallback(provider => provider.translateGermanToRussian(germanPhrase)), [callApiWithFallback]);
  const handleGenerateCardsFromTranscript = useCallback(
    (transcript: string, sourceLang: 'ru' | 'de') =>
        callApiWithFallback(provider => provider.generateCardsFromTranscript(transcript, sourceLang)),
    [callApiWithFallback]
  );
  const handleGenerateTopicCards = useCallback(
    (topic: string, refinement?: string, existingPhrases?: string[]) => callApiWithFallback(provider => provider.generateTopicCards(topic, refinement, existingPhrases)),
    [callApiWithFallback]
  );
   const handleClassifyTopic = useCallback(
    (topic: string) => callApiWithFallback(provider => provider.classifyTopic(topic)),
    [callApiWithFallback]
  );
  const handleGetCategoryAssistantResponse = useCallback(
    (categoryName: string, existingPhrases: Phrase[], request: CategoryAssistantRequest) => 
        callApiWithFallback(provider => provider.getCategoryAssistantResponse(categoryName, existingPhrases, request)),
    [callApiWithFallback]
  );


  const handleOpenAddPhraseModal = (options: { language: 'ru' | 'de'; autoSubmit: boolean }) => {
    if (!apiProvider) return;
    setAddPhraseConfig(options);
    setIsAddPhraseModalOpen(true);
  };

  const handlePhraseCreated = (newPhraseData: { german: string; russian: string }) => {
    const normalizedGerman = newPhraseData.german.trim().toLowerCase();
    const isDuplicate = allPhrases.some(p => p.german.trim().toLowerCase() === normalizedGerman);
    const isDuplicateInCategory = categoryToView ? allPhrases.some(p => p.category === categoryToView.id && p.german.trim().toLowerCase() === normalizedGerman) : false;

    if (isDuplicateInCategory) {
        showToast({ message: `Карточка "${newPhraseData.german}" уже есть в этой категории.` });
        return;
    } else if (isDuplicate) {
        showToast({ message: `Карточка "${newPhraseData.german}" уже существует в другой категории.` });
        return;
    }


    const newPhrase: Phrase = {
        ...newPhraseData,
        id: Math.random().toString(36).substring(2, 9),
        masteryLevel: 0,
        lastReviewedAt: null,
        nextReviewAt: Date.now(),
        knowCount: 0,
        knowStreak: 0,
        isMastered: false,
        category: categoryToView?.id || 'general',
        lapses: 0,
        isNew: true,
    };
    updateAndSavePhrases(prev => [newPhrase, ...prev]);
    
    setIsAddPhraseModalOpen(false);

    if (!categoryToView) {
      setCurrentPracticePhrase(newPhrase);
      setIsPracticeAnswerRevealed(false);
      setView('practice');
    }
  };
  
  const handleCreateProposedCards = useCallback(async (proposedCards: ProposedCard[], options?: { categoryId?: string; createCategoryName?: string }) => {
    let finalCategoryId = options?.categoryId;
    let newCategory: Category | null = null;

    if (options?.createCategoryName && !finalCategoryId) {
        const trimmedName = options.createCategoryName.trim();
        const existingCategory = categories.find(c => c.name.trim().toLowerCase() === trimmedName.toLowerCase());

        if (existingCategory) {
            finalCategoryId = existingCategory.id;
        } else {
            const colors = [ 'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500' ];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            const capitalizedName = trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1);
            
            newCategory = {
                id: capitalizedName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36),
                name: capitalizedName,
                color: randomColor,
                isFoundational: false,
            };
            
            updateAndSaveCategories(prev => [...prev, newCategory!]);
            handleSettingsChange({
                enabledCategories: { ...settings.enabledCategories, [newCategory.id]: true }
            });
            finalCategoryId = newCategory.id;
        }
    }
    
    const targetCategoryId = finalCategoryId || assistantCategory?.id || categoryToView?.id || 'general';
    const targetCategory = newCategory || categories.find(c => c.id === targetCategoryId);

    if (!targetCategory) {
        console.error("Target category could not be determined.");
        return;
    }

    const duplicatesFound: { existingPhrase: Phrase, proposedCard: ProposedCard }[] = [];
    const newCards: ProposedCard[] = [];
    const normalizedExistingPhrases = new Map<string, Phrase>();
    allPhrases.forEach(p => {
        normalizedExistingPhrases.set(p.german.trim().toLowerCase(), p);
    });
    
    proposedCards.forEach(proposed => {
        const normalizedProposed = proposed.german.trim().toLowerCase();
        const existingPhrase = normalizedExistingPhrases.get(normalizedProposed);
        
        if (existingPhrase && existingPhrase.category !== targetCategory.id) {
            duplicatesFound.push({ existingPhrase, proposedCard: proposed });
        } else if (!existingPhrase) {
            newCards.push(proposed);
        }
    });
    
    if (duplicatesFound.length > 0) {
        setDuplicatesReviewData({
            duplicates: duplicatesFound,
            newCards: newCards,
            targetCategory: targetCategory,
        });
        setIsMoveOrSkipModalOpen(true);
        setIsSmartImportModalOpen(false); 
        setSmartImportInitialTopic(undefined);
        return;
    }
    
    const addedCount = addCardsToCategory(newCards, targetCategory);
    
    const skippedCount = proposedCards.length - addedCount;
    let toastMessage = `✓ ${addedCount} ${addedCount === 1 ? 'карточка добавлена' : (addedCount > 1 && addedCount < 5 ? 'карточки добавлены' : 'карточек добавлено')}.`;
    if (skippedCount > 0) {
        toastMessage += ` ${skippedCount} уже существовали и были пропущены.`;
    }
    showToast({ message: toastMessage });
    
    if (categoryToView || assistantCategory) { /* stay in view */ } 
    else {
        setView('list');
        // This is tricky because addCardsToCategory doesn't return the new phrases, just the count.
        // For simplicity, we'll just switch to the list view without highlighting.
        setHighlightedPhraseId(null);
    }
  }, [allPhrases, categories, categoryToView, assistantCategory, settings.enabledCategories, handleSettingsChange, showToast, updateAndSaveCategories, updateAndSavePhrases]);


  const handleCreateCardFromWord = useCallback((phraseData: { german: string; russian: string; }) => {
    // Check for duplicates before creating
    const alreadyExists = allPhrases.some(p => p.german.trim().toLowerCase() === phraseData.german.trim().toLowerCase());
    if (alreadyExists) {
        showToast({ message: `Карточка "${phraseData.german}" уже существует.` });
        return;
    }

    const newPhrase: Phrase = {
        ...phraseData,
        id: Math.random().toString(36).substring(2, 9),
        masteryLevel: 0,
        lastReviewedAt: null,
        nextReviewAt: Date.now(),
        knowCount: 0,
        knowStreak: 0,
        isMastered: false,
        category: 'general',
        lapses: 0,
        isNew: true,
    };
    updateAndSavePhrases(prev => [newPhrase, ...prev]);
    
    showToast({ message: `Карточка для "${phraseData.german}" создана` });
  }, [allPhrases, updateAndSavePhrases, showToast]);

  const handleCreateCardFromSelection = useCallback(async (germanText: string): Promise<boolean> => {
      if (!apiProvider) {
          showToast({ message: "AI provider not available." });
          return false;
      }
      const alreadyExists = allPhrases.some(p => p.german.trim().toLowerCase() === germanText.trim().toLowerCase());
      if (alreadyExists) {
          showToast({ message: `Карточка "${germanText}" уже существует.` });
          return false;
      }
  
      try {
          const { russian } = await callApiWithFallback(provider => provider.translateGermanToRussian(germanText));
          
          const newPhrase: Phrase = {
              german: germanText,
              russian: russian,
              id: Math.random().toString(36).substring(2, 9),
              masteryLevel: 0,
              lastReviewedAt: null,
              nextReviewAt: Date.now(),
              knowCount: 0,
              knowStreak: 0,
              isMastered: false,
              category: 'general',
              lapses: 0,
              isNew: true,
          };
          updateAndSavePhrases(prev => [newPhrase, ...prev]);
          showToast({ message: `Карточка для "${germanText}" создана` });
          return true;
      } catch (error) {
          console.error("Failed to create card from selection:", error);
          showToast({ message: "Не удалось создать карточку." });
          return false;
      }
  }, [allPhrases, updateAndSavePhrases, showToast, callApiWithFallback, apiProvider]);


  const handleOpenImproveModal = (phrase: Phrase) => {
    if (!apiProvider) return;
    setPhraseToImprove(phrase);
    setIsImproveModalOpen(true);
  };

  const handleOpenDiscussionFromImprove = (phraseForDiscussion: Phrase) => {
    setIsImproveModalOpen(false);
    setPhraseToDiscuss(phraseForDiscussion);
    setDiscussInitialMessage("Давай обсудим, можно ли эту фразу улучшить и правильно, если она звучит с точки зрения носителя языка");
    setIsDiscussModalOpen(true);
  };

  const handleGenerateImprovement = useCallback((originalRussian: string, currentGerman: string) => callApiWithFallback(provider => provider.improvePhrase(originalRussian, currentGerman)),[callApiWithFallback]);
  
  const handleTranslatePhrase = useCallback((russian: string) => callApiWithFallback(provider => provider.translatePhrase(russian)), [callApiWithFallback]);
  
  const handleDiscussTranslation = useCallback((request: any) => callApiWithFallback(provider => provider.discussTranslation(request)),[callApiWithFallback]);

  const handleFindDuplicates = useCallback(() => callApiWithFallback(provider => provider.findDuplicatePhrases(allPhrases)), [callApiWithFallback, allPhrases]);

  const handlePhraseImproved = (phraseId: string, newGerman: string, newRussian?: string) => {
    updateAndSavePhrases(prev =>
      prev.map(p => (p.id === phraseId ? { ...p, german: newGerman, russian: newRussian ?? p.russian } : p))
    );
  };

  const handleSavePhraseEdits = (phraseId: string, updates: Partial<Omit<Phrase, 'id'>>) => {
    updateAndSavePhrases(prev =>
      prev.map(p => (p.id === phraseId ? { ...p, ...updates } : p))
    );
  };

  const handleOpenEditModal = (phrase: Phrase) => {
    setPhraseToEdit(phrase);
    setIsEditModalOpen(true);
  };

  const handleDeletePhrase = useCallback((phraseId: string) => {
    const phrase = allPhrases.find(p => p.id === phraseId);
    if (phrase) {
        setPhraseToDelete(phrase);
        setIsDeleteModalOpen(true);
    }
  }, [allPhrases]);

  const handleConfirmDelete = useCallback(() => {
    if (phraseToDelete) {
        updateAndSavePhrases(prev => prev.filter(p => p.id !== phraseToDelete.id));
        if (currentPracticePhrase?.id === phraseToDelete.id) {
           setCurrentPracticePhrase(null); // Clear from practice view if it was active
        }
        setIsDeleteModalOpen(false);
        setPhraseToDelete(null);
    }
  }, [phraseToDelete, updateAndSavePhrases, currentPracticePhrase]);

  const handleStartPracticeWithPhrase = (phraseToPractice: Phrase) => {
    specificPhraseRequestedRef.current = true;
    setCurrentPracticePhrase(phraseToPractice);
    setIsPracticeAnswerRevealed(false);
    setCardHistory([]);
    setView('practice');
  };

  const handleStartPracticeWithCategory = (categoryId: PhraseCategory) => {
    setPracticeCategoryFilter(categoryId);
    setView('practice');
  };

  const handleGoToListFromPractice = (phrase: Phrase) => {
    setView('list');
    setHighlightedPhraseId(phrase.id);
  };
  
  const handleOpenDiscussModal = (phrase: Phrase) => {
    setPhraseToDiscuss(phrase);
    setIsDiscussModalOpen(true);
  };

  const handleDiscussionAccept = (suggestion: { russian: string; german: string; }) => {
    if (phraseToDiscuss) {
      handlePhraseImproved(phraseToDiscuss.id, suggestion.german, suggestion.russian);
    }
    setIsDiscussModalOpen(false);
    setDiscussInitialMessage(undefined);
  };
  
  const handleOpenLearningAssistant = (phrase: Phrase) => {
    if (!apiProvider) return;
    setLearningAssistantPhrase(phrase);
    setIsLearningAssistantModalOpen(true);
  };
  
  const handleLearningAssistantSuccess = useCallback((phrase: Phrase) => {
    if (settings.soundEffects) playCorrectSound();
    const updatedPhrase = updatePhraseMasteryAndCache(phrase, 'know');
    if (currentPracticePhrase?.id === phrase.id) {
      setCurrentPracticePhrase(updatedPhrase);
    }
  }, [updatePhraseMasteryAndCache, currentPracticePhrase, settings.soundEffects]);

  const handleMarkPhraseAsSeen = useCallback((phraseId: string) => {
    updateAndSavePhrases(prev => {
        const phraseExists = prev.some(p => p.id === phraseId && p.isNew);
        if (!phraseExists) return prev; // Avoid unnecessary updates
        
        return prev.map(p => {
            if (p.id === phraseId && p.isNew) {
                // Creates a new object without the isNew property
                const { isNew, ...rest } = p;
                return rest;
            }
            return p;
        });
    });
  }, [updateAndSavePhrases]);

  const handleUpdatePhraseCategory = useCallback((phraseId: string, newCategoryId: string) => {
    updateAndSavePhrases(prev =>
      prev.map(p =>
        p.id === phraseId
          ? { ...p, category: newCategoryId }
          : p
      )
    );
  }, [updateAndSavePhrases]);

  // --- Category Management Handlers ---
  const handleOpenCategoryFormForAdd = () => {
      setIsCategoryManagerModalOpen(false);
      setCategoryToEdit(null);
      setIsCategoryFormModalOpen(true);
  };
  
  const handleOpenCategoryFormForEdit = (category: Category) => {
      setIsCategoryManagerModalOpen(false);
      setCategoryToEdit(category);
      setIsCategoryFormModalOpen(true);
  };
  
  const handleSaveCategory = (categoryData: { name: string; color: string }): boolean => {
    const trimmedName = categoryData.name;
    const lowercasedName = trimmedName.toLowerCase();
    const capitalizedName = trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1);
    const finalCategoryData = { ...categoryData, name: capitalizedName };

    if (categoryToEdit) { // Editing existing category
        const isDuplicate = categories.some(
            c => c.id !== categoryToEdit.id && c.name.trim().toLowerCase() === lowercasedName
        );
        if (isDuplicate) {
            return false; // Signal failure: name already exists
        }
        
        updateAndSaveCategories(prev => prev.map(c => c.id === categoryToEdit.id ? { ...c, ...finalCategoryData } : c));
        setIsCategoryFormModalOpen(false);
        setCategoryToEdit(null);
        setIsCategoryManagerModalOpen(true);

    } else { // Adding new category
        const isDuplicate = categories.some(
            c => c.name.trim().toLowerCase() === lowercasedName
        );
        if (isDuplicate) {
            return false; // Signal failure: name already exists
        }
        
        const newCategory: Category = {
            id: finalCategoryData.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36),
            name: finalCategoryData.name,
            color: finalCategoryData.color,
            isFoundational: false,
        };
        updateAndSaveCategories(prev => [...prev, newCategory]);
        handleSettingsChange({
            enabledCategories: { ...settings.enabledCategories, [newCategory.id]: true }
        });
        setIsCategoryFormModalOpen(false);
        setCategoryToEdit(null);
        setCategoryToAutoFill(newCategory);
    }
    return true; // Signal success
  };

  const handleConfirmDeleteCategory = ({ migrationTargetId }: { migrationTargetId: string | null }) => {
    if (!categoryToDelete) return;
    
    if (migrationTargetId) {
        updateAndSavePhrases(prev => prev.map(p => p.category === categoryToDelete.id ? { ...p, category: migrationTargetId } : p));
    } else {
        updateAndSavePhrases(prev => prev.filter(p => p.category !== categoryToDelete.id));
    }
    updateAndSaveCategories(prev => prev.filter(c => c.id !== categoryToDelete.id));
    const newEnabled = { ...settings.enabledCategories };
    delete newEnabled[categoryToDelete.id];
    handleSettingsChange({ enabledCategories: newEnabled });
    setCategoryToDelete(null);
  };
  
  const handleAddPhraseFromCategoryDetail = () => {
    handleOpenAddPhraseModal({ language: 'ru', autoSubmit: true });
  };
  
  const handleOpenCategoryAssistant = (category: Category) => {
      setCategoryToView(null); // Close detail view
      setAssistantCategory(category);
      setIsCategoryAssistantModalOpen(true);
  };
  
  const handleStartAutoFill = async (category: Category) => {
    if (!apiProvider) return;

    setCategoryToAutoFill(null);
    setAutoFillingCategory(category);

    try {
        const proposedCards = await handleGenerateTopicCards(category.name.replace(/^!/, '').trim());
        setProposedCardsForFill(proposedCards);
        setIsAutoFillPreviewOpen(true);
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : 'Ошибка генерации карточек.' });
      setAutoFillingCategory(null);
    }
  };

  const handleRefineAutoFill = async (refinement: string) => {
    if (!autoFillingCategory) return;
    setIsRefining(true);
    try {
        const proposedCards = await handleGenerateTopicCards(
            autoFillingCategory.name.replace(/^!/, '').trim(),
            refinement
        );
        setProposedCardsForFill(proposedCards);
    } catch (err) {
        showToast({ message: err instanceof Error ? err.message : 'Ошибка генерации карточек.' });
    } finally {
        setIsRefining(false);
    }
  };

  const addCardsToCategory = useCallback((cards: ProposedCard[], targetCategory: Category): number => {
    const phrasesToAdd = cards.map(p => ({
        ...p,
        id: Math.random().toString(36).substring(2, 9),
        masteryLevel: 0, lastReviewedAt: null, nextReviewAt: Date.now(),
        knowCount: 0, knowStreak: 0, isMastered: false,
        category: targetCategory.id, lapses: 0, isNew: true,
    }));
    if (phrasesToAdd.length > 0) {
        updateAndSavePhrases(prev => [...phrasesToAdd, ...prev]);
    }
    return phrasesToAdd.length;
  }, [updateAndSavePhrases]);


  const handleConfirmAutoFill = useCallback((selectedCards: ProposedCard[]) => {
      if (!autoFillingCategory) return;

      const duplicatesFound: { existingPhrase: Phrase, proposedCard: ProposedCard }[] = [];
      const newCards: ProposedCard[] = [];

      const normalizedExistingPhrases = new Map<string, Phrase>();
      allPhrases.forEach(p => {
          normalizedExistingPhrases.set(p.german.trim().toLowerCase(), p);
      });

      selectedCards.forEach(proposed => {
          const normalizedProposed = proposed.german.trim().toLowerCase();
          const existingPhrase = normalizedExistingPhrases.get(normalizedProposed);
          
          if (existingPhrase && existingPhrase.category !== autoFillingCategory.id) {
              duplicatesFound.push({ existingPhrase, proposedCard: proposed });
          } else if (!existingPhrase) {
              newCards.push(proposed);
          }
      });

      if (duplicatesFound.length > 0) {
          setDuplicatesReviewData({
              duplicates: duplicatesFound,
              newCards: newCards,
              targetCategory: autoFillingCategory,
          });
          setIsMoveOrSkipModalOpen(true);
          setIsAutoFillPreviewOpen(false);
          setAutoFillingCategory(null);
      } else {
          const addedCount = addCardsToCategory(newCards, autoFillingCategory);
          showToast({ message: `✓ ${addedCount} карточек добавлено в категорию "${autoFillingCategory.name}".` });
          setIsAutoFillPreviewOpen(false);
          setCategoryToView(autoFillingCategory);
          setAutoFillingCategory(null);
      }
  }, [autoFillingCategory, allPhrases, addCardsToCategory, showToast]);
  
  const handleMoveReviewedDuplicates = (phraseIdsToMove: string[], newCards: ProposedCard[], targetCategory: Category) => {
    updateAndSavePhrases(prev => 
        prev.map(p => 
            phraseIdsToMove.includes(p.id) ? { ...p, category: targetCategory.id } : p
        )
    );
    const addedCount = addCardsToCategory(newCards, targetCategory);
    showToast({ message: `✓ ${phraseIdsToMove.length} карточек перемещено и ${addedCount} добавлено в "${targetCategory.name}".` });
    
    setIsMoveOrSkipModalOpen(false);
    setDuplicatesReviewData(null);
    setCategoryToView(targetCategory);
  };
    
  const handleAddOnlyNewFromReview = (newCards: ProposedCard[], targetCategory: Category) => {
      const addedCount = addCardsToCategory(newCards, targetCategory);
      showToast({ message: `✓ ${addedCount} карточек добавлено в "${targetCategory.name}". Дубликаты пропущены.` });

      setIsMoveOrSkipModalOpen(false);
      setDuplicatesReviewData(null);
      setCategoryToView(targetCategory);
  };



  // --- Practice Page Logic ---
  const unmasteredPhrases = useMemo(() => allPhrases.filter(p => p && !p.isMastered && settings.enabledCategories[p.category]), [allPhrases, settings.enabledCategories]);

  const practicePool = useMemo(() => {
    if (practiceCategoryFilter === 'all') {
      return unmasteredPhrases;
    }
    return unmasteredPhrases.filter(p => p.category === practiceCategoryFilter);
  }, [unmasteredPhrases, practiceCategoryFilter]);

  const changePracticePhrase = useCallback((nextPhrase: Phrase | null, direction: AnimationDirection) => {
    setIsPracticeAnswerRevealed(false);
    setPracticeCardEvaluated(false);
    if (!nextPhrase) {
        setCurrentPracticePhrase(null);
        return;
    }
    setPracticeAnimationState({ key: nextPhrase.id, direction });
    setCurrentPracticePhrase(nextPhrase);
  }, []);
  
  const isInitialFilterChange = useRef(true);
  useEffect(() => {
    if (specificPhraseRequestedRef.current) {
        return;
    }

    if (view !== 'practice' || isInitialFilterChange.current) {
        isInitialFilterChange.current = false;
        return;
    }

    // A change in the filter should immediately present a new card from that category.
    const newPool = practiceCategoryFilter === 'all'
        ? unmasteredPhrases
        : unmasteredPhrases.filter(p => p.category === practiceCategoryFilter);
    
    const nextPhrase = srsService.selectNextPhrase(newPool, null); // Get a fresh card from the new pool
    changePracticePhrase(nextPhrase, 'right');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceCategoryFilter, view]);


  const selectNextPracticePhrase = useCallback(() => {
    if (currentPracticePhrase) {
        setCardHistory(prev => [...prev, currentPracticePhrase.id]);
        setLearningAssistantCache(prev => {
            const newCache = { ...prev };
            delete newCache[currentPracticePhrase.id];
            return newCache;
        });
    }

    const nextPhrase = srsService.selectNextPhrase(practicePool, currentPracticePhrase?.id ?? null);
    
    if (nextPhrase) {
        changePracticePhrase(nextPhrase, 'right');
    } else {
        // No due or new cards. This is our trigger to generate more.
        changePracticePhrase(null, 'right'); // Clear view to show loading/empty state
        if (!isGenerating && apiProvider) {
            fetchNewPhrases(10);
        }
    }
  }, [practicePool, currentPracticePhrase, fetchNewPhrases, isGenerating, changePracticePhrase, apiProvider]);

  useEffect(() => {
    if (specificPhraseRequestedRef.current) {
        specificPhraseRequestedRef.current = false;
        return;
    }
    if (!isLoading && allPhrases.length > 0 && !currentPracticePhrase && view === 'practice') {
      selectNextPracticePhrase();
    }
  }, [isLoading, allPhrases, currentPracticePhrase, selectNextPracticePhrase, view]);
  
  useEffect(() => {
    if (currentPracticePhrase && !allPhrases.some(p => p && p.id === currentPracticePhrase.id)) {
      selectNextPracticePhrase();
    }
  }, [allPhrases, currentPracticePhrase, selectNextPracticePhrase]);

  useEffect(() => {
    if (isVoiceWorkspaceModalOpen && currentPracticePhrase) {
      setVoiceWorkspacePhrase(currentPracticePhrase);
    }
  }, [currentPracticePhrase, isVoiceWorkspaceModalOpen]);

  const transitionToNext = useCallback((direction: AnimationDirection = 'right') => {
    if (practiceIsExitingRef.current) return;

    practiceIsExitingRef.current = true;
    setTimeout(() => {
      if (direction === 'right') {
          selectNextPracticePhrase();
      }
      practiceIsExitingRef.current = false;
    }, 250);
  }, [selectNextPracticePhrase]);
  
  const handlePracticeUpdateMastery = useCallback((action: 'know' | 'forgot' | 'dont_know') => {
    if (!currentPracticePhrase || practiceIsExitingRef.current) return;

    handleLogMasteryButtonUsage(action);
    const originalPhrase = currentPracticePhrase;

    let updatedPhrase = srsService.updatePhraseMastery(originalPhrase, action, categories);
    
    // Leech detection logic
    if (action === 'forgot' || action === 'dont_know') {
      const wasLeech = srsService.isLeech(originalPhrase);
      const isNowLeech = srsService.isLeech(updatedPhrase);
      
      if (!wasLeech && isNowLeech) {
        // Just save the updated phrase with its new lapse count and open the modal.
        // The modal will decide the next review time.
        updateAndSavePhrases(prev => prev.map(p => p.id === updatedPhrase.id ? updatedPhrase : p));
        setLeechPhrase(updatedPhrase);
        setIsLeechModalOpen(true);
        // Exit early to not flip the card; the modal takes over the flow.
        return;
      }
    }

    updateAndSavePhrases(prev => prev.map(p => p.id === updatedPhrase.id ? updatedPhrase : p));
    
    if (updatedPhrase.isMastered && !originalPhrase.isMastered) {
      cacheService.clearCacheForPhrase(updatedPhrase.id);
    }

    // Always show the flipped card
    setIsPracticeAnswerRevealed(true);
    setPracticeCardEvaluated(true);
    setCurrentPracticePhrase(updatedPhrase); // Update the card state before showing it flipped

    if (action === 'know') {
        if (settings.soundEffects) playCorrectSound();
    } else {
        if (settings.soundEffects) playIncorrectSound();
    }
  }, [currentPracticePhrase, handleLogMasteryButtonUsage, updateAndSavePhrases, settings.soundEffects, categories]);

  const handleLeechAction = useCallback((phrase: Phrase, action: 'continue' | 'reset' | 'postpone') => {
    let updatedPhrase = { ...phrase };
    const now = Date.now();

    if (action === 'continue') {
        updatedPhrase.nextReviewAt = now + 10 * 60 * 1000; // 10 minutes
    } else if (action === 'reset') {
        updatedPhrase = {
            ...phrase,
            masteryLevel: 0,
            lastReviewedAt: null,
            nextReviewAt: now,
            knowCount: 0,
            knowStreak: 0,
            lapses: 0, // Reset lapses so it's not a leech anymore
            isMastered: false,
        };
    } else { // postpone
        updatedPhrase.nextReviewAt = now + 24 * 60 * 60 * 1000; // 24 hours
    }

    updateAndSavePhrases(prev => prev.map(p => (p.id === updatedPhrase.id ? updatedPhrase : p)));
    setIsLeechModalOpen(false);
    setLeechPhrase(null);
    transitionToNext();
  }, [updateAndSavePhrases, transitionToNext]);


  const handlePracticeSwipeRight = useCallback(() => {
    if (practiceIsExitingRef.current || cardHistory.length === 0) return;
    practiceIsExitingRef.current = true;
    setTimeout(() => {
      const lastPhraseId = cardHistory[cardHistory.length - 1];
      const prevPhrase = allPhrases.find(p => p.id === lastPhraseId);
      if (prevPhrase) {
        setCardHistory(prev => prev.slice(0, -1));
        changePracticePhrase(prevPhrase, 'left');
      }
      practiceIsExitingRef.current = false;
    }, 250);
  }, [allPhrases, cardHistory, changePracticePhrase]);
  // --- End Practice Page Logic ---

  // Speak the phrase when the card is flipped to the answer side.
  useEffect(() => {
    if (isPracticeAnswerRevealed && currentPracticePhrase && settings.autoSpeak && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(currentPracticePhrase.german);
      utterance.lang = 'de-DE';
      utterance.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  }, [isPracticeAnswerRevealed, currentPracticePhrase, settings.autoSpeak]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      
      // Check if any modal is open by looking for a modal backdrop
      const isModalOpen = !!document.querySelector('.fixed.inset-0.bg-black\\/60, .fixed.inset-0.bg-black\\/70');
      if (isModalOpen) return;

      if (view === 'practice' && currentPracticePhrase && !practiceIsExitingRef.current) {
        if (e.key === 'ArrowRight') {
            transitionToNext('right');
        } else if (e.key === 'ArrowLeft') {
          handlePracticeSwipeRight();
        } else if (e.key === ' ') { // Space bar to flip
          e.preventDefault();
          if (!isPracticeAnswerRevealed) {
            setIsPracticeAnswerRevealed(true);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    view, 
    currentPracticePhrase, 
    isPracticeAnswerRevealed,
    transitionToNext, 
    handlePracticeSwipeRight,
  ]);


  const getProviderDisplayName = () => {
      if (!apiProvider) return '';
      const name = apiProvider.getProviderName();
      if (name.toLowerCase().includes('gemini')) return 'Google Gemini';
      if (name.toLowerCase().includes('deepseek')) return 'DeepSeek';
      return name;
  }
  
  const handleOpenLibrary = () => setView('library');
  const handleOpenBook = (bookId: number) => {
    setActiveBookId(bookId);
    setView('reader');
  };

  const phrasesForCategory = useMemo(() => {
    if (!categoryToView) return [];
    return allPhrases.filter(p => p.category === categoryToView.id);
  }, [categoryToView, allPhrases]);

  const phraseCountForDeletion = useMemo(() => {
      if (!categoryToDelete) return 0;
      return allPhrases.filter(p => p.category === categoryToDelete.id).length;
  }, [categoryToDelete, allPhrases]);

  const renderCurrentView = () => {
    switch (view) {
        case 'practice':
            return <PracticePage
             currentPhrase={currentPracticePhrase}
             isAnswerRevealed={isPracticeAnswerRevealed}
             onSetIsAnswerRevealed={setIsPracticeAnswerRevealed}
             isCardEvaluated={practiceCardEvaluated}
             animationState={practiceAnimationState}
             isExiting={practiceIsExitingRef.current}
             unmasteredCount={unmasteredPhrases.length}
             currentPoolCount={practicePool.length}
             fetchNewPhrases={fetchNewPhrases}
             isLoading={isLoading}
             error={error}
             isGenerating={isGenerating}
             apiProviderAvailable={!!apiProvider}
             onUpdateMastery={handlePracticeUpdateMastery}
             onContinue={() => transitionToNext('right')}
             onSwipeRight={handlePracticeSwipeRight}
             onOpenChat={openChatForPhrase}
             onOpenDeepDive={handleOpenDeepDive}
             onOpenMovieExamples={handleOpenMovieExamples}
             onOpenWordAnalysis={handleOpenWordAnalysis}
             onOpenVerbConjugation={handleOpenVerbConjugation}
             onOpenNounDeclension={handleOpenNounDeclension}
             onOpenAdjectiveDeclension={handleOpenAdjectiveDeclension}
             onOpenSentenceChain={handleOpenSentenceChain}
             onOpenImprovePhrase={handleOpenImproveModal}
             onOpenLearningAssistant={handleOpenLearningAssistant}
             onOpenVoiceWorkspace={handleOpenVoiceWorkspace}
             onDeletePhrase={handleDeletePhrase}
             onGoToList={handleGoToListFromPractice}
             onOpenDiscussTranslation={handleOpenDiscussModal}
             settings={settings}
             masteryButtonUsage={masteryButtonUsage}
             allPhrases={allPhrases}
             onCreateCard={handleCreateCardFromWord}
             onAnalyzeWord={analyzeWord}
             onGenerateQuickReplyOptions={handleGenerateQuickReplyOptions}
             isWordAnalysisLoading={isWordAnalysisLoading}
             cardActionUsage={cardActionUsage}
             onLogCardActionUsage={handleLogCardActionUsage}
             cardHistoryLength={cardHistory.length}
             practiceCategoryFilter={practiceCategoryFilter}
             setPracticeCategoryFilter={setPracticeCategoryFilter}
             onMarkPhraseAsSeen={handleMarkPhraseAsSeen}
             categories={categories}
           />;
        case 'list':
            return <PhraseListPage 
                phrases={allPhrases}
                onEditPhrase={handleOpenEditModal}
                onDeletePhrase={handleDeletePhrase}
                onFindDuplicates={handleFindDuplicates}
                updateAndSavePhrases={updateAndSavePhrases}
                onStartPractice={handleStartPracticeWithPhrase}
                highlightedPhraseId={highlightedPhraseId}
                onClearHighlight={() => setHighlightedPhraseId(null)}
                onOpenSmartImport={() => setIsSmartImportModalOpen(true)}
                categories={categories}
                onUpdatePhraseCategory={handleUpdatePhraseCategory}
                onStartPracticeWithCategory={handleStartPracticeWithCategory}
                onEditCategory={handleOpenCategoryFormForEdit}
                onOpenAssistant={handleOpenCategoryAssistant}
            />;
        case 'library':
            return <LibraryPage onOpenBook={handleOpenBook} />;
        case 'reader':
            return activeBookId ? (
                <ReaderPage
                    bookId={activeBookId}
                    onClose={() => setView('library')}
                />
            ) : null;
        default:
            return null;
    }
  }


  return (
    <div className="min-h-screen bg-transparent text-white font-sans p-4 flex flex-col items-center overflow-x-hidden">
      <Header 
        view={view} 
        onSetView={setView} 
        onOpenSettings={() => setIsSettingsModalOpen(true)} 
      />
      <main className={`w-full flex-grow flex flex-col items-center pt-20 ${view === 'practice' ? 'justify-center' : ''}`}>
        {renderCurrentView()}
      </main>
      
      {view === 'practice' && !isLoading && (
        <ExpandingFab 
          onAddPhrase={handleOpenAddPhraseModal}
          onSmartImport={() => setIsSmartImportModalOpen(true)}
          onOpenLibrary={handleOpenLibrary}
          disabled={!apiProvider}
        />
      )}

      <footer className="text-center text-slate-500 py-4 text-sm h-6">
        {isGenerating ? "Идет генерация новых фраз..." : (apiProvider ? `Powered by ${getProviderDisplayName()}`: "")}
      </footer>
      
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {chatContextPhrase && apiProviderType && <ChatModal 
          isOpen={isChatModalOpen} 
          onClose={() => setIsChatModalOpen(false)} 
          phrase={chatContextPhrase} 
          onGenerateInitialExamples={handleGenerateInitialExamples}
          onContinueChat={handleContinueChat}
          apiProviderType={apiProviderType}
          onOpenWordAnalysis={handleOpenWordAnalysis}
          allPhrases={allPhrases}
          onCreateCard={handleCreateCardFromWord}
          onAnalyzeWord={analyzeWord}
          onOpenVerbConjugation={handleOpenVerbConjugation}
          onOpenNounDeclension={handleOpenNounDeclension}
          onOpenAdjectiveDeclension={handleOpenAdjectiveDeclension}
          onTranslateGermanToRussian={handleTranslateGermanToRussian}
      />}
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
        settings={settings} 
        onSettingsChange={handleSettingsChange} 
        categories={categories}
        onOpenCategoryManager={() => setIsCategoryManagerModalOpen(true)}
      />
      {deepDivePhrase && <DeepDiveModal 
        isOpen={isDeepDiveModalOpen} 
        onClose={() => setIsDeepDiveModalOpen(false)} 
        phrase={deepDivePhrase}
        analysis={deepDiveAnalysis}
        isLoading={isDeepDiveLoading}
        error={deepDiveError}
        onOpenWordAnalysis={handleOpenWordAnalysis}
      />}
       {movieExamplesPhrase && <MovieExamplesModal 
        isOpen={isMovieExamplesModalOpen} 
        onClose={() => setIsMovieExamplesModalOpen(false)} 
        phrase={movieExamplesPhrase}
        examples={movieExamples}
        isLoading={isMovieExamplesLoading}
        error={movieExamplesError}
        onOpenWordAnalysis={handleOpenWordAnalysis}
      />}
       {sentenceChainPhrase && <SentenceChainModal
        isOpen={isSentenceChainModalOpen}
        onClose={() => setIsSentenceChainModalOpen(false)}
        phrase={sentenceChainPhrase}
        onGenerateContinuations={handleGenerateContinuations}
        onWordClick={handleOpenWordAnalysis}
        />}
      {wordAnalysisPhrase && <WordAnalysisModal 
        isOpen={isWordAnalysisModalOpen}
        onClose={() => setIsWordAnalysisModalOpen(false)}
        word={selectedWord}
        phrase={wordAnalysisPhrase}
        analysis={wordAnalysis}
        isLoading={isWordAnalysisLoading}
        error={wordAnalysisError}
        onOpenVerbConjugation={handleOpenVerbConjugation}
        onOpenNounDeclension={handleOpenNounDeclension}
        onOpenAdjectiveDeclension={handleOpenAdjectiveDeclension}
        onOpenWordAnalysis={handleOpenWordAnalysis}
        allPhrases={allPhrases}
        onCreateCard={handleCreateCardFromWord}
      />}
      {conjugationVerb && <VerbConjugationModal
        isOpen={isVerbConjugationModalOpen}
        onClose={() => setIsVerbConjugationModalOpen(false)}
        infinitive={conjugationVerb}
        data={verbConjugationData}
        isLoading={isVerbConjugationLoading}
        error={verbConjugationError}
        onOpenWordAnalysis={handleOpenWordAnalysis}
       />}
       {declensionNoun && <NounDeclensionModal
        isOpen={isNounDeclensionModalOpen}
        onClose={() => setIsNounDeclensionModalOpen(false)}
        noun={declensionNoun.noun}
        data={nounDeclensionData}
        isLoading={isNounDeclensionLoading}
        error={nounDeclensionError}
        onOpenWordAnalysis={handleOpenWordAnalysis}
       />}
       {declensionAdjective && <AdjectiveDeclensionModal
        isOpen={isAdjectiveDeclensionModalOpen}
        onClose={() => setIsAdjectiveDeclensionModalOpen(false)}
        adjective={declensionAdjective}
        data={adjectiveDeclensionData}
        isLoading={isAdjectiveDeclensionLoading}
        error={adjectiveDeclensionError}
        onOpenWordAnalysis={handleOpenWordAnalysis}
       />}
       {apiProvider && <AddPhraseModal 
          isOpen={isAddPhraseModalOpen} 
          onClose={() => setIsAddPhraseModalOpen(false)}
          onGenerate={handleGenerateSinglePhrase}
          onTranslateGerman={handleTranslateGermanToRussian}
          onPhraseCreated={handlePhraseCreated}
          language={addPhraseConfig.language}
          autoSubmit={addPhraseConfig.autoSubmit}
      />}
      {apiProvider && <SmartImportModal 
          isOpen={isSmartImportModalOpen}
          onClose={() => {
              setIsSmartImportModalOpen(false);
              setSmartImportInitialTopic(undefined);
          }}
          onGenerateCards={handleGenerateCardsFromTranscript}
          onGenerateTopicCards={handleGenerateTopicCards}
          onCardsCreated={handleCreateProposedCards}
          onClassifyTopic={handleClassifyTopic}
          initialTopic={smartImportInitialTopic}
          allPhrases={allPhrases}
          categories={categories}
      />}
       {phraseToImprove && <ImprovePhraseModal
          isOpen={isImproveModalOpen}
          onClose={() => setIsImproveModalOpen(false)}
          phrase={phraseToImprove}
          onGenerateImprovement={handleGenerateImprovement}
          onPhraseImproved={handlePhraseImproved}
          onOpenDiscussion={handleOpenDiscussionFromImprove}
       />}
        {phraseToEdit && apiProvider && <EditPhraseModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            phrase={phraseToEdit}
            onSave={handleSavePhraseEdits}
            onTranslate={handleTranslatePhrase}
            onDiscuss={handleDiscussTranslation}
            onOpenWordAnalysis={handleOpenWordAnalysis}
            categories={categories}
       />}
       <ConfirmDeleteModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={handleConfirmDelete}
            phrase={phraseToDelete}
       />
       {leechPhrase && <LeechModal 
          isOpen={isLeechModalOpen}
          phrase={leechPhrase}
          onImprove={(phrase) => {
            handleLeechAction(phrase, 'postpone');
            handleOpenImproveModal(phrase);
          }}
          onDiscuss={(phrase) => {
            handleLeechAction(phrase, 'postpone');
            handleOpenDiscussModal(phrase);
          }}
          onContinue={(phrase) => handleLeechAction(phrase, 'continue')}
          onReset={(phrase) => handleLeechAction(phrase, 'reset')}
          onPostpone={(phrase) => handleLeechAction(phrase, 'postpone')}
        />}
       <VoiceWorkspaceModal
            isOpen={isVoiceWorkspaceModalOpen}
            onClose={() => setIsVoiceWorkspaceModalOpen(false)}
            phrase={voiceWorkspacePhrase}
            onEvaluate={handleEvaluateSpokenPhraseAttempt}
            onSuccess={handlePhraseActionSuccess}
            onFailure={handlePhraseActionFailure}
            onNextPhrase={() => {
                setIsVoiceWorkspaceModalOpen(false);
                transitionToNext();
            }}
            onGeneratePhraseBuilderOptions={useCallback((phrase: Phrase) => callApiWithFallback(p => p.generatePhraseBuilderOptions(phrase)), [callApiWithFallback])}
            onPracticeNext={() => selectNextPracticePhrase()}
            settings={settings}
            buttonUsage={buttonUsage}
            onLogButtonUsage={handleLogButtonUsage}
            habitTracker={habitTracker}
            onHabitTrackerChange={handleHabitTrackerChange}
            showToast={showToast}
            onOpenLearningAssistant={handleOpenLearningAssistant}
       />
       {learningAssistantPhrase && <LearningAssistantModal
            isOpen={isLearningAssistantModalOpen}
            onClose={(didSucceed?: boolean) => {
                setIsLearningAssistantModalOpen(false);
                const shouldReturnToWorkspace = isVoiceWorkspaceModalOpen;

                if (didSucceed && learningAssistantPhrase) {
                    const finalPhraseState = allPhrases.find(p => p.id === learningAssistantPhrase.id) || learningAssistantPhrase;
                    handleOpenVoiceWorkspace(finalPhraseState);
                } else if (shouldReturnToWorkspace && learningAssistantPhrase) {
                    handleOpenVoiceWorkspace(learningAssistantPhrase);
                }
            }}
            phrase={learningAssistantPhrase}
            onGuide={handleGuideToTranslation}
            onSuccess={handleLearningAssistantSuccess}
            onOpenVerbConjugation={handleOpenVerbConjugation}
            onOpenNounDeclension={handleOpenNounDeclension}
            onOpenPronounsModal={() => setIsPronounsModalOpen(true)}
            onOpenWFragenModal={() => setIsWFragenModalOpen(true)}
            cache={learningAssistantCache}
            setCache={setLearningAssistantCache}
            onOpenWordAnalysis={handleOpenWordAnalysis}
            onOpenAdjectiveDeclension={handleOpenAdjectiveDeclension}
       />}
       {phraseToDiscuss && apiProvider && <DiscussTranslationModal
            isOpen={isDiscussModalOpen}
            onClose={() => {
                setIsDiscussModalOpen(false);
                setDiscussInitialMessage(undefined);
            }}
            originalRussian={phraseToDiscuss.russian}
            currentGerman={phraseToDiscuss.german}
            onDiscuss={handleDiscussTranslation}
            onAccept={handleDiscussionAccept}
            onOpenWordAnalysis={handleOpenWordAnalysis}
            initialMessage={discussInitialMessage}
        />}
        <PronounsModal isOpen={isPronounsModalOpen} onClose={() => setIsPronounsModalOpen(false)} onOpenWordAnalysis={handleOpenWordAnalysis} />
        <WFragenModal isOpen={isWFragenModalOpen} onClose={() => setIsWFragenModalOpen(false)} onOpenWordAnalysis={handleOpenWordAnalysis} />

        {/* Category Management Modals */}
        <CategoryManagerModal
            isOpen={isCategoryManagerModalOpen}
            onClose={() => setIsCategoryManagerModalOpen(false)}
            categories={categories}
            onAddCategory={handleOpenCategoryFormForAdd}
            onEditCategory={handleOpenCategoryFormForEdit}
            onDeleteCategory={setCategoryToDelete}
            onViewCategory={(category) => {
                setCategoryToView(category);
                setIsCategoryManagerModalOpen(false);
            }}
        />
        <CategoryDetailModal
            isOpen={!!categoryToView}
            onClose={() => setCategoryToView(null)}
            category={categoryToView}
            phrases={phrasesForCategory}
            allCategories={categories}
            onUpdatePhraseCategory={handleUpdatePhraseCategory}
            onEditPhrase={handleOpenEditModal}
            onDeletePhrase={handleDeletePhrase}
            onPreviewPhrase={handleStartPracticeWithPhrase}
            onStartPractice={handleStartPracticeWithPhrase}
            onAddPhrase={handleAddPhraseFromCategoryDetail}
            onAIAssist={handleOpenCategoryAssistant}
        />
        <CategoryFormModal
            isOpen={isCategoryFormModalOpen}
            onClose={() => {
                setIsCategoryFormModalOpen(false);
                setIsCategoryManagerModalOpen(true);
            }}
            onSubmit={handleSaveCategory}
            initialData={categoryToEdit}
        />
        <ConfirmDeleteCategoryModal
            isOpen={!!categoryToDelete}
            onClose={() => setCategoryToDelete(null)}
            onConfirm={handleConfirmDeleteCategory}
            category={categoryToDelete}
            phraseCount={phraseCountForDeletion}
            allCategories={categories}
        />
        <ConfirmCategoryFillModal
            isOpen={!!categoryToAutoFill}
            onClose={() => {
                setCategoryToAutoFill(null);
                setIsCategoryManagerModalOpen(true);
            }}
            onConfirm={handleStartAutoFill}
            category={categoryToAutoFill}
        />
        <AutoFillLoadingModal isOpen={!!autoFillingCategory && !isAutoFillPreviewOpen} category={autoFillingCategory} />
        <AutoFillPreviewModal
            isOpen={isAutoFillPreviewOpen}
            onClose={() => {
                setIsAutoFillPreviewOpen(false);
                setAutoFillingCategory(null);
            }}
            categoryName={autoFillingCategory?.name || ''}
            proposedCards={proposedCardsForFill}
            onConfirm={handleConfirmAutoFill}
            onRefine={handleRefineAutoFill}
            isLoading={isRefining}
        />
        <MoveOrSkipModal
            isOpen={isMoveOrSkipModalOpen}
            onClose={() => setIsMoveOrSkipModalOpen(false)}
            reviewData={duplicatesReviewData}
            categories={categories}
            onMove={handleMoveReviewedDuplicates}
            onAddOnlyNew={handleAddOnlyNewFromReview}
        />
        {assistantCategory && (
            <CategoryAssistantModal
                isOpen={isCategoryAssistantModalOpen}
                onClose={(view?: View) => {
                    setIsCategoryAssistantModalOpen(false);
                    if (view) {
                        setView(view);
                    }
                }}
                category={assistantCategory}
                phrases={allPhrases.filter(p => p.category === assistantCategory.id)}
                onGetAssistantResponse={handleGetCategoryAssistantResponse}
                onAddCards={handleCreateProposedCards}
                cache={assistantCache}
                setCache={setAssistantCache}
                onOpenWordAnalysis={handleOpenWordAnalysis}
                allPhrases={allPhrases}
                onCreateCard={handleCreateCardFromWord}
                onAnalyzeWord={analyzeWord}
                onOpenVerbConjugation={handleOpenVerbConjugation}
                onOpenNounDeclension={handleOpenNounDeclension}
                onOpenAdjectiveDeclension={handleOpenAdjectiveDeclension}
                onTranslateGermanToRussian={handleTranslateGermanToRussian}
                onGoToList={() => setView('list')}
            />
        )}
    </div>
  );
};

export default App;