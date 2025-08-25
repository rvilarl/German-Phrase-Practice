



import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Phrase, DeepDiveAnalysis, MovieExample, WordAnalysis, VerbConjugation, NounDeclension, SentenceContinuation, PhraseBuilderOptions, PhraseEvaluation, ChatMessage } from './types';
import * as srsService from './services/srsService';
import * as cacheService from './services/cacheService';
import { getProviderPriorityList, getFallbackProvider, ApiProviderType } from './services/apiProvider';
import { AiService } from './services/aiService';
import { initialPhrases as defaultPhrases } from './data/initialPhrases';
import { playCorrectSound, playIncorrectSound } from './services/soundService';

import Header from './components/Header';
import PracticePage from './pages/PracticePage';
import PhraseListPage from './pages/PhraseListPage';
import ChatModal from './components/ChatModal';
import SettingsModal from './components/SettingsModal';
import DeepDiveModal from './components/DeepDiveModal';
import MovieExamplesModal from './components/MovieExamplesModal';
import WordAnalysisModal from './components/WordAnalysisModal';
import VerbConjugationModal from './components/VerbConjugationModal';
import NounDeclensionModal from './components/NounDeclensionModal';
import SentenceChainModal from './components/SentenceChainModal';
import AddPhraseModal from './components/AddPhraseModal';
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


const PHRASES_STORAGE_KEY = 'germanPhrases';
const SETTINGS_STORAGE_KEY = 'germanAppSettings';
const BUTTON_USAGE_STORAGE_KEY = 'germanAppButtonUsage';
const MASTERY_BUTTON_USAGE_STORAGE_KEY = 'germanAppMasteryButtonUsage';
const HABIT_TRACKER_STORAGE_KEY = 'germanAppHabitTracker';

type View = 'practice' | 'list';
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

const defaultSettings = {
  autoSpeak: true,
  soundEffects: true,
  dynamicButtonLayout: true,
  automation: {
    autoCheckShortPhrases: true,
    learnNextPhraseHabit: true,
  },
};

const defaultHabitTracker = { 
    quickNextCount: 0, 
    quickBuilderNextCount: 0 
};

const App: React.FC = () => {
  const [allPhrases, setAllPhrases] = useState<Phrase[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('practice');
  const [highlightedPhraseId, setHighlightedPhraseId] = useState<string | null>(null);
  
  // --- State Lifted from PracticePage ---
  const [currentPracticePhrase, setCurrentPracticePhrase] = useState<Phrase | null>(null);
  const [isPracticeAnswerRevealed, setIsPracticeAnswerRevealed] = useState(false);
  const [practiceAnimationState, setPracticeAnimationState] = useState<AnimationState>({ key: '', direction: 'right' });
  const [cardHistory, setCardHistory] = useState<string[]>([]);
  const practiceIsExitingRef = useRef(false);
  // --- End State Lift ---

  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatContextPhrase, setChatContextPhrase] = useState<Phrase | null>(null);
  
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [buttonUsage, setButtonUsage] = useState({ close: 0, continue: 0, next: 0 });
  const [masteryButtonUsage, setMasteryButtonUsage] = useState({ know: 0, forgot: 0, dont_know: 0 });
  const [habitTracker, setHabitTracker] = useState(defaultHabitTracker);
  
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

  const [isSentenceChainModalOpen, setIsSentenceChainModalOpen] = useState(false);
  const [sentenceChainPhrase, setSentenceChainPhrase] = useState<Phrase | null>(null);
  
  const [isAddPhraseModalOpen, setIsAddPhraseModalOpen] = useState(false);
  const [addPhraseConfig, setAddPhraseConfig] = useState({ language: 'ru' as 'ru' | 'de', autoSubmit: true });

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
  
  const [isPronounsModalOpen, setIsPronounsModalOpen] = useState(false);
  const [isWFragenModalOpen, setIsWFragenModalOpen] = useState(false);
  
  const [hintCache, setHintCache] = useState<{ [phraseId: string]: string }>({});

  const isPrefetchingRef = useRef(false);


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

        try {
            const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (storedSettings) {
                const parsedSettings = JSON.parse(storedSettings);
                // Merge with defaults to ensure new settings are applied
                setSettings(prev => ({
                    ...defaultSettings,
                    ...prev,
                    ...parsedSettings,
                    automation: { ...defaultSettings.automation, ...parsedSettings.automation },
                }));
            }
            const storedUsage = localStorage.getItem(BUTTON_USAGE_STORAGE_KEY);
            if (storedUsage) setButtonUsage(JSON.parse(storedUsage));

            const storedMasteryUsage = localStorage.getItem(MASTERY_BUTTON_USAGE_STORAGE_KEY);
            if (storedMasteryUsage) setMasteryButtonUsage(JSON.parse(storedMasteryUsage));

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
                            const knowCount = p.knowCount ?? 0;
                            const knowStreak = p.knowStreak ?? 0;
                            const masteryLevel = p.masteryLevel ?? 0;
                            const phraseData = {
                                russian: p.russian!,
                                german: p.german!,
                                id: p.id ?? Math.random().toString(36).substring(2, 9),
                                knowCount,
                                knowStreak,
                                masteryLevel,
                                lastReviewedAt: p.lastReviewedAt ?? null,
                                nextReviewAt: p.nextReviewAt ?? Date.now(),
                                isMastered: p.isMastered ?? false,
                                hint: p.hint,
                            };
                            return {
                                ...phraseData,
                                isMastered: p.isMastered ?? srsService.isPhraseMastered(phraseData),
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
        }
        
        setAllPhrases(loadedPhrases);
        setIsLoading(false);
    };

    initializeApp();
  }, []);


  const callApiWithFallback = useCallback(async <T,>(
    apiCall: (provider: AiService) => Promise<T>
  ): Promise<T> => {
    if (!apiProvider || !apiProviderType) throw new Error("AI provider not initialized.");
    try {
        return await apiCall(apiProvider);
    } catch (primaryError) {
        console.warn(`API call with ${apiProviderType} failed:`, primaryError);
        const fallback = getFallbackProvider(apiProviderType);
        if (fallback) {
            console.log(`Attempting fallback to ${fallback.type}...`);
            setApiProvider(fallback.provider);
            setApiProviderType(fallback.type);
            try {
                return await apiCall(fallback.provider);
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
  
  const handleGenerateHint = useCallback(async (phrase: Phrase): Promise<string> => {
    if (phrase.hint) return phrase.hint;

    const cacheKey = `hint_${phrase.id}`;
    const cachedHint = hintCache[phrase.id] || cacheService.getCache<string>(cacheKey);

    if (cachedHint) {
        if (!phrase.hint) {
          updateAndSavePhrases(prev => prev.map(p => p.id === phrase.id ? { ...p, hint: cachedHint } : p));
        }
        if (!hintCache[phrase.id]) {
            setHintCache(prev => ({ ...prev, [phrase.id]: cachedHint }));
        }
        return cachedHint;
    }

    const { hint } = await callApiWithFallback(provider => provider.generatePhraseHint(phrase));
    
    setHintCache(prev => ({ ...prev, [phrase.id]: hint }));
    cacheService.setCache(cacheKey, hint);
    updateAndSavePhrases(prev => prev.map(p => p.id === phrase.id ? { ...p, hint } : p));
    
    return hint;
  }, [callApiWithFallback, hintCache, updateAndSavePhrases]);

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
            knowCount: 0, knowStreak: 0, isMastered: false,
        }));
        updateAndSavePhrases(prev => [...prev, ...phrasesToAdd]);
        
        // Proactively generate hints in the background
        phrasesToAdd.forEach(p => {
          handleGenerateHint(p).catch(err => {
            console.warn(`Hint pre-fetching failed for new phrase ${p.id}:`, err);
          });
        });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error during phrase generation.');
    } finally {
      setIsGenerating(false);
    }
  }, [allPhrases, isGenerating, updateAndSavePhrases, callApiWithFallback, apiProvider, error, handleGenerateHint]);

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
  
  const handleOpenWordAnalysis = useCallback(async (phrase: Phrase, word: string) => {
    if (!apiProvider) return;
    setWordAnalysisPhrase(phrase);
    setSelectedWord(word);
    setIsWordAnalysisModalOpen(true);
    setIsWordAnalysisLoading(true);
    setWordAnalysis(null);
    setWordAnalysisError(null);
    const cacheKey = `word_analysis_${phrase.id}_${word.toLowerCase()}`;
    const cachedAnalysis = cacheService.getCache<WordAnalysis>(cacheKey);
    if (cachedAnalysis) {
        setWordAnalysis(cachedAnalysis);
        setIsWordAnalysisLoading(false);
        return;
    }
    try {
        const analysis = await callApiWithFallback(provider => provider.analyzeWordInPhrase(phrase, word));
        setWordAnalysis(analysis);
        cacheService.setCache(cacheKey, analysis);
    } catch (err) {
        setWordAnalysisError(err instanceof Error ? err.message : 'Unknown error during word analysis.');
    } finally {
        setIsWordAnalysisLoading(false);
    }
  }, [callApiWithFallback, apiProvider]);

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
  
  // New proactive pre-fetching effect
  useEffect(() => {
    if (view === 'practice' && currentPracticePhrase) {
        prefetchPhraseBuilderOptions(currentPracticePhrase.id);
    }
  }, [view, currentPracticePhrase, prefetchPhraseBuilderOptions]);


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

  const handlePhraseActionSuccess = useCallback((phrase: Phrase) => {
    if (settings.soundEffects) playCorrectSound();
    const updatedPhrase = srsService.updatePhraseMastery(phrase, 'know');
    updateAndSavePhrases(prev =>
      prev.map(p => (p.id === phrase.id ? updatedPhrase : p))
    );
  }, [updateAndSavePhrases, settings.soundEffects]);

  const handlePhraseActionFailure = useCallback((phrase: Phrase) => {
    if (settings.soundEffects) playIncorrectSound();
     const updatedPhrase = srsService.updatePhraseMastery(phrase, 'forgot');
    updateAndSavePhrases(prev =>
      prev.map(p => (p.id === phrase.id ? updatedPhrase : p))
    );
  }, [updateAndSavePhrases, settings.soundEffects]);


  const handleGenerateContinuations = useCallback((russianPhrase: string) => callApiWithFallback(provider => provider.generateSentenceContinuations(russianPhrase)),[callApiWithFallback]);
  const handleGenerateInitialExamples = useCallback((phrase: Phrase) => callApiWithFallback(provider => provider.generateInitialExamples(phrase)),[callApiWithFallback]);
  const handleContinueChat = useCallback((phrase: Phrase, history: any[], newMessage: string) => callApiWithFallback(provider => provider.continueChat(phrase, history, newMessage)),[callApiWithFallback]);
  const handleGuideToTranslation = useCallback((phrase: Phrase, history: ChatMessage[], userAnswer: string) => callApiWithFallback(provider => provider.guideToTranslation(phrase, history, userAnswer)),[callApiWithFallback]);
  const handleGenerateSinglePhrase = useCallback((russianPhrase: string) => callApiWithFallback(provider => provider.generateSinglePhrase(russianPhrase)),[callApiWithFallback]);
  const handleTranslateGermanToRussian = useCallback((germanPhrase: string) => callApiWithFallback(provider => provider.translateGermanToRussian(germanPhrase)), [callApiWithFallback]);


  const handleOpenAddPhraseModal = (options: { language: 'ru' | 'de'; autoSubmit: boolean }) => {
    if (!apiProvider) return;
    setAddPhraseConfig(options);
    setIsAddPhraseModalOpen(true);
  };

  const handlePhraseCreated = (newPhraseData: { german: string; russian: string }) => {
    const newPhrase: Phrase = {
        ...newPhraseData,
        id: Math.random().toString(36).substring(2, 9),
        masteryLevel: 0,
        lastReviewedAt: null,
        nextReviewAt: Date.now(),
        knowCount: 0,
        knowStreak: 0,
        isMastered: false,
    };
    updateAndSavePhrases(prev => [newPhrase, ...prev]);
    
    handleGenerateHint(newPhrase).catch(err => {
      console.warn(`Hint generation failed for created phrase ${newPhrase.id}:`, err);
    });

    setIsAddPhraseModalOpen(false);
    // Show the new card immediately
    setCurrentPracticePhrase(newPhrase);
    setIsPracticeAnswerRevealed(false);
    setView('practice');
  };

  const handleOpenImproveModal = (phrase: Phrase) => {
    if (!apiProvider) return;
    setPhraseToImprove(phrase);
    setIsImproveModalOpen(true);
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
    setCurrentPracticePhrase(phraseToPractice);
    setIsPracticeAnswerRevealed(false);
    setCardHistory([]);
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
  };
  
  const handleOpenLearningAssistant = (phrase: Phrase) => {
    if (!apiProvider) return;
    setLearningAssistantPhrase(phrase);
    setIsLearningAssistantModalOpen(true);
  };
  
  const handleLearningAssistantSuccess = useCallback((phrase: Phrase) => {
    if (settings.soundEffects) playCorrectSound();
    const updatedPhrase = srsService.updatePhraseMastery(phrase, 'know');
    updateAndSavePhrases(prev =>
      prev.map(p => (p.id === phrase.id ? updatedPhrase : p))
    );
    if (currentPracticePhrase?.id === phrase.id) {
      setCurrentPracticePhrase(updatedPhrase);
    }
  }, [updateAndSavePhrases, currentPracticePhrase, settings.soundEffects]);

  // --- Practice Page Logic ---
  const unmasteredPhrases = useMemo(() => allPhrases.filter(p => p && !p.isMastered), [allPhrases]);

  const changePracticePhrase = useCallback((nextPhrase: Phrase | null, direction: AnimationDirection) => {
    setIsPracticeAnswerRevealed(false);
    if (!nextPhrase) {
        setCurrentPracticePhrase(null);
        return;
    }
    setPracticeAnimationState({ key: nextPhrase.id, direction });
    setCurrentPracticePhrase(nextPhrase);
  }, []);

  const selectNextPracticePhrase = useCallback((addToHistory: boolean = true) => {
    if (currentPracticePhrase) {
      if (addToHistory) {
        setCardHistory(prev => [...prev, currentPracticePhrase.id]);
      }
      // Clear the learning assistant cache for the card that is going away
      setLearningAssistantCache(prev => {
        const newCache = { ...prev };
        delete newCache[currentPracticePhrase.id];
        return newCache;
      });
    }

    const nextPhrase = srsService.selectNextPhrase(unmasteredPhrases, currentPracticePhrase?.id ?? null);
    changePracticePhrase(nextPhrase, 'right');
    
    // Pre-fetch hint for the card *after* the next one.
    if (nextPhrase && apiProvider) {
      const phraseAfterNext = srsService.selectNextPhrase(unmasteredPhrases, nextPhrase.id);
      if (phraseAfterNext) {
        handleGenerateHint(phraseAfterNext).catch(err => {
          console.warn(`Hint pre-fetching failed for phrase ${phraseAfterNext.id}:`, err);
        });
      }
    }

    const POOL_FETCH_THRESHOLD = 7;
    const ACTIVE_POOL_TARGET = 10;
    const PHRASES_TO_FETCH = 5;
    if (unmasteredPhrases.length < POOL_FETCH_THRESHOLD && !isGenerating && allPhrases.length > 0) {
        const needed = ACTIVE_POOL_TARGET - unmasteredPhrases.length;
        fetchNewPhrases(Math.max(needed, PHRASES_TO_FETCH));
    }
  }, [unmasteredPhrases, currentPracticePhrase, fetchNewPhrases, isGenerating, allPhrases.length, changePracticePhrase, apiProvider, handleGenerateHint]);

  useEffect(() => {
    if (!isLoading && allPhrases.length > 0 && !currentPracticePhrase && view === 'practice') {
      selectNextPracticePhrase(false);
    }
  }, [isLoading, allPhrases, currentPracticePhrase, selectNextPracticePhrase, view]);
  
  useEffect(() => {
    if (currentPracticePhrase && !allPhrases.some(p => p && p.id === currentPracticePhrase.id)) {
      selectNextPracticePhrase(false);
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
  
  const handlePracticeUpdateMastery = (action: 'know' | 'forgot' | 'dont_know', options?: { autoAdvance?: boolean }) => {
    if (!currentPracticePhrase || practiceIsExitingRef.current) return;

    handleLogMasteryButtonUsage(action);

    const phraseToSpeak = currentPracticePhrase.german;
    const updatedPhrase = srsService.updatePhraseMastery(currentPracticePhrase, action);
    
    updateAndSavePhrases(prev => prev.map(p => p.id === updatedPhrase.id ? updatedPhrase : p));
    
    // Always show the flipped card if not auto-advancing, even for 'know'.
    if (action === 'know' && options?.autoAdvance) {
      if (settings.soundEffects) playCorrectSound();
      setCurrentPracticePhrase(updatedPhrase);
    } else {
      setIsPracticeAnswerRevealed(true);
      setCurrentPracticePhrase(updatedPhrase); // Update the card state before showing it flipped

      if (action === 'know') {
          if (settings.soundEffects) playCorrectSound();
      } else {
          if (settings.soundEffects) playIncorrectSound();
          if (settings.autoSpeak && 'speechSynthesis' in window) {
              const utterance = new SpeechSynthesisUtterance(phraseToSpeak);
              utterance.lang = 'de-DE';
              utterance.rate = 0.9;
              window.speechSynthesis.speak(utterance);
          }
      }
    }
  };


  const handlePracticeSwipeRight = () => {
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
  };
  // --- End Practice Page Logic ---


  const getProviderDisplayName = () => {
      if (!apiProvider) return '';
      const name = apiProvider.getProviderName();
      if (name.toLowerCase().includes('gemini')) return 'Google Gemini';
      if (name.toLowerCase().includes('deepseek')) return 'DeepSeek';
      return name;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-4 flex flex-col items-center overflow-x-hidden">
      <Header 
        view={view} 
        onSetView={setView} 
        onOpenSettings={() => setIsSettingsModalOpen(true)} 
      />
      <main className={`w-full flex-grow flex flex-col items-center pt-20 ${view === 'practice' ? 'justify-center' : ''}`}>
        {view === 'practice' ? (
           <PracticePage
             currentPhrase={currentPracticePhrase}
             isAnswerRevealed={isPracticeAnswerRevealed}
             animationState={practiceAnimationState}
             isExiting={practiceIsExitingRef.current}
             unmasteredCount={unmasteredPhrases.length}
             fetchNewPhrases={fetchNewPhrases}
             isLoading={isLoading}
             error={error}
             isGenerating={isGenerating}
             apiProviderAvailable={!!apiProvider}
             onUpdateMastery={handlePracticeUpdateMastery}
             onContinue={() => transitionToNext('right')}
             onSwipeLeft={() => transitionToNext('right')}
             onSwipeRight={handlePracticeSwipeRight}
             onOpenChat={openChatForPhrase}
             onOpenDeepDive={handleOpenDeepDive}
             onOpenMovieExamples={handleOpenMovieExamples}
             onOpenWordAnalysis={handleOpenWordAnalysis}
             onOpenSentenceChain={handleOpenSentenceChain}
             onOpenImprovePhrase={handleOpenImproveModal}
             onOpenLearningAssistant={handleOpenLearningAssistant}
             onOpenVoiceWorkspace={handleOpenVoiceWorkspace}
             onDeletePhrase={handleDeletePhrase}
             onGoToList={handleGoToListFromPractice}
             onOpenDiscussTranslation={handleOpenDiscussModal}
             onGenerateHint={handleGenerateHint}
             settings={settings}
             masteryButtonUsage={masteryButtonUsage}
           />
        ) : (
          <PhraseListPage 
            phrases={allPhrases}
            onEditPhrase={handleOpenEditModal}
            onDeletePhrase={handleDeletePhrase}
            onFindDuplicates={handleFindDuplicates}
            updateAndSavePhrases={updateAndSavePhrases}
            onStartPractice={handleStartPracticeWithPhrase}
            highlightedPhraseId={highlightedPhraseId}
            onClearHighlight={() => setHighlightedPhraseId(null)}
          />
        )}
      </main>
      
      {view === 'practice' && !isLoading && (
        <ExpandingFab 
          onAddPhrase={handleOpenAddPhraseModal}
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
      />}
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} settings={settings} onSettingsChange={handleSettingsChange} />
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
        onOpenWordAnalysis={handleOpenWordAnalysis}
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
       {apiProvider && <AddPhraseModal 
          isOpen={isAddPhraseModalOpen} 
          onClose={() => setIsAddPhraseModalOpen(false)}
          onGenerate={handleGenerateSinglePhrase}
          onTranslateGerman={handleTranslateGermanToRussian}
          onPhraseCreated={handlePhraseCreated}
          language={addPhraseConfig.language}
          autoSubmit={addPhraseConfig.autoSubmit}
      />}
       {phraseToImprove && <ImprovePhraseModal
          isOpen={isImproveModalOpen}
          onClose={() => setIsImproveModalOpen(false)}
          phrase={phraseToImprove}
          onGenerateImprovement={handleGenerateImprovement}
          onPhraseImproved={handlePhraseImproved}
       />}
        {phraseToEdit && apiProvider && <EditPhraseModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            phrase={phraseToEdit}
            onSave={handlePhraseImproved}
            onTranslate={handleTranslatePhrase}
            onDiscuss={handleDiscussTranslation}
            onOpenWordAnalysis={handleOpenWordAnalysis}
       />}
       <ConfirmDeleteModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={handleConfirmDelete}
            phrase={phraseToDelete}
       />
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
       />
       {learningAssistantPhrase && <LearningAssistantModal
            isOpen={isLearningAssistantModalOpen}
            onClose={(didSucceed?: boolean) => {
                setIsLearningAssistantModalOpen(false);
                if (didSucceed && learningAssistantPhrase) {
                    const finalPhraseState = allPhrases.find(p => p.id === learningAssistantPhrase.id) || learningAssistantPhrase;
                    handleOpenVoiceWorkspace(finalPhraseState);
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
       />}
       {phraseToDiscuss && apiProvider && <DiscussTranslationModal
            isOpen={isDiscussModalOpen}
            onClose={() => setIsDiscussModalOpen(false)}
            originalRussian={phraseToDiscuss.russian}
            currentGerman={phraseToDiscuss.german}
            onDiscuss={handleDiscussTranslation}
            onAccept={handleDiscussionAccept}
            onOpenWordAnalysis={handleOpenWordAnalysis}
        />}
        <PronounsModal isOpen={isPronounsModalOpen} onClose={() => setIsPronounsModalOpen(false)} onOpenWordAnalysis={handleOpenWordAnalysis} />
        <WFragenModal isOpen={isWFragenModalOpen} onClose={() => setIsWFragenModalOpen(false)} onOpenWordAnalysis={handleOpenWordAnalysis} />
    </div>
  );
};

export default App;