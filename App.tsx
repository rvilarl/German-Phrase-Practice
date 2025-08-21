import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Phrase, DeepDiveAnalysis, MovieExample, WordAnalysis, VerbConjugation, NounDeclension, SentenceContinuation } from './types';
import * as srsService from './services/srsService';
import * as cacheService from './services/cacheService';
import { getProviderPriorityList, getFallbackProvider, ApiProviderType } from './services/apiProvider';
import { AiService } from './services/aiService';
import { initialPhrases as defaultPhrases } from './data/initialPhrases';
import PhraseCard from './components/PhraseCard';
import Spinner from './components/Spinner';
import ChatModal from './components/ChatModal';
import SettingsModal from './components/SettingsModal';
import DeepDiveModal from './components/DeepDiveModal';
import MovieExamplesModal from './components/MovieExamplesModal';
import WordAnalysisModal from './components/WordAnalysisModal';
import VerbConjugationModal from './components/VerbConjugationModal';
import NounDeclensionModal from './components/NounDeclensionModal';
import SentenceChainModal from './components/SentenceChainModal';
import SettingsIcon from './components/icons/SettingsIcon';
import AddPhraseModal from './components/AddPhraseModal';
import PlusIcon from './components/icons/PlusIcon';

const PHRASES_STORAGE_KEY = 'germanPhrases';
const SETTINGS_STORAGE_KEY = 'germanAppSettings';
const ACTIVE_POOL_TARGET = 10;
const POOL_FETCH_THRESHOLD = 7; 
const PHRASES_TO_FETCH = 5; 
const SWIPE_THRESHOLD = 50; // pixels

type AnimationDirection = 'left' | 'right';
interface AnimationState {
  key: string;
  direction: AnimationDirection;
}

const App: React.FC = () => {
  const [allPhrases, setAllPhrases] = useState<Phrase[]>([]);
  const [currentPhrase, setCurrentPhrase] = useState<Phrase | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isExiting, setIsExiting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [animationState, setAnimationState] = useState<AnimationState>({ key: '', direction: 'right' });
  const [cardHistory, setCardHistory] = useState<string[]>([]);
  
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatContextPhrase, setChatContextPhrase] = useState<Phrase | null>(null);
  
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settings, setSettings] = useState({ autoSpeak: true });

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
  const [isVerbConjugationLoading, setIsVerbConjugationLoading] = useState(false);
  const [verbConjugationError, setVerbConjugationError] = useState<string | null>(null);
  const [conjugationVerb, setConjugationVerb] = useState<string>('');

  const [isNounDeclensionModalOpen, setIsNounDeclensionModalOpen] = useState(false);
  const [nounDeclensionData, setNounDeclensionData] = useState<NounDeclension | null>(null);
  const [isNounDeclensionLoading, setIsNounDeclensionLoading] = useState(false);
  const [nounDeclensionError, setNounDeclensionError] = useState<string | null>(null);
  const [declensionNoun, setDeclensionNoun] = useState<{ noun: string; article: string } | null>(null);

  const [isSentenceChainModalOpen, setIsSentenceChainModalOpen] = useState(false);
  const [sentenceChainPhrase, setSentenceChainPhrase] = useState<Phrase | null>(null);
  
  const [isAddPhraseModalOpen, setIsAddPhraseModalOpen] = useState(false);

  const [apiProvider, setApiProvider] = useState<AiService | null>(null);
  const [apiProviderType, setApiProviderType] = useState<ApiProviderType | null>(null);

  const touchStartRef = useRef<number | null>(null);
  const touchMoveRef = useRef<number | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
        setIsLoading(true);
        setError(null);

        // 1. Health check and select provider
        const providerList = getProviderPriorityList();
        let activeProvider: AiService | null = null;
        let activeProviderType: ApiProviderType | null = null;

        if (providerList.length === 0) {
            setError("No AI provider configured. Please check your API keys.");
        } else {
            for (const providerInfo of providerList) {
                console.log(`Performing health check for ${providerInfo.type}...`);
                const isHealthy = await providerInfo.provider.healthCheck();
                if (isHealthy) {
                    console.log(`✅ ${providerInfo.type} is healthy. Setting as active provider.`);
                    activeProvider = providerInfo.provider;
                    activeProviderType = providerInfo.type;
                    break; // Found a working provider
                }
            }
        }

        if (activeProvider) {
            setApiProvider(activeProvider);
            setApiProviderType(activeProviderType);
        } else if (providerList.length > 0) {
            setError("AI features are temporarily unavailable. All configured providers failed health checks.");
        }

        // 2. Load settings
        try {
            const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (storedSettings) {
                setSettings(JSON.parse(storedSettings));
            }
        } catch (e) {
            console.error("Failed to load settings", e);
        }

        // 3. Load phrases
        let loadedPhrases: Phrase[] = [];
        try {
            const storedPhrases = localStorage.getItem(PHRASES_STORAGE_KEY);
            if (storedPhrases) {
                const parsedPhrases: Phrase[] = JSON.parse(storedPhrases);
                loadedPhrases = parsedPhrases.map(p => ({
                    ...p,
                    id: p.id ?? Math.random().toString(36).substring(2, 9),
                    knowCount: p.knowCount ?? 0,
                    knowStreak: p.knowStreak ?? 0,
                    isMastered: p.isMastered ?? srsService.isPhraseMastered(p),
                }));
            }
        } catch (e) {
            console.error("Failed to load or parse phrases from storage", e);
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


  // --- API Call with Fallback ---
  const callApiWithFallback = useCallback(async <T,>(
    apiCall: (provider: AiService) => Promise<T>
  ): Promise<T> => {
    if (!apiProvider || !apiProviderType) {
        throw new Error("AI provider not initialized.");
    }
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
        } catch (e) {
            console.error("Failed to save phrases to storage", e);
        }
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

  // --- Phrase Logic ---
  const unmasteredPhrases = useMemo(() => allPhrases.filter(p => !p.isMastered), [allPhrases]);

  const fetchNewPhrases = useCallback(async (count: number = PHRASES_TO_FETCH) => {
    if (isGenerating || !apiProvider) {
        if (!apiProvider) setError("AI provider is not available for generating new phrases.");
        return;
    };
    setIsGenerating(true);
    // Keep existing error message if it's an API availability issue
    if (!error?.includes("AI features are temporarily unavailable")) {
        setError(null);
    }
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error during phrase generation.');
    } finally {
      setIsGenerating(false);
    }
  }, [allPhrases, isGenerating, updateAndSavePhrases, callApiWithFallback, apiProvider, error]);

  const changePhrase = useCallback((nextPhrase: Phrase | null, direction: AnimationDirection) => {
    if (!nextPhrase) {
        setCurrentPhrase(null);
        return;
    }
    setAnimationState({ key: nextPhrase.id, direction });
    setCurrentPhrase(nextPhrase);
  }, []);

  const selectNext = useCallback((addToHistory: boolean = true) => {
    if (currentPhrase && addToHistory) {
      setCardHistory(prev => [...prev, currentPhrase.id]);
    }
    const nextPhrase = srsService.selectNextPhrase(allPhrases, currentPhrase?.id ?? null);
    changePhrase(nextPhrase, 'right');
    
    if (unmasteredPhrases.length < POOL_FETCH_THRESHOLD && !isGenerating && allPhrases.length > 0) {
        const needed = ACTIVE_POOL_TARGET - unmasteredPhrases.length;
        fetchNewPhrases(Math.max(needed, PHRASES_TO_FETCH));
    }
  }, [allPhrases, currentPhrase, fetchNewPhrases, isGenerating, unmasteredPhrases.length, changePhrase]);

  useEffect(() => {
    if (!isLoading && allPhrases.length > 0 && !currentPhrase) {
      selectNext(false);
    }
  }, [isLoading, allPhrases, selectNext, currentPhrase]);

  // --- UI Handlers ---
  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const transitionToNext = useCallback((direction: AnimationDirection = 'right') => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      setIsAnswerRevealed(false);
      if (direction === 'right') {
          selectNext();
      } else {
         // Handle going back if needed, or other directions
      }
      setIsExiting(false);
    }, 250);
  }, [isExiting, selectNext]);

  const handleUpdateMastery = (action: 'know' | 'forgot' | 'dont_know') => {
    if (!currentPhrase || isExiting) return;
    const updatedPhrase = srsService.updatePhraseMastery(currentPhrase, action);
    updateAndSavePhrases(prev => prev.map(p => p.id === updatedPhrase.id ? updatedPhrase : p));
    
    if (action === 'know') {
        transitionToNext();
    } else {
        setIsAnswerRevealed(true);
        if (settings.autoSpeak) speak(currentPhrase.german);
    }
  };
  
  const handleImproveSkill = () => {
    if (!currentPhrase || isExiting) return;
    setIsAnswerRevealed(true);
    if (settings.autoSpeak) speak(currentPhrase.german);
  }

  const handleContinue = () => transitionToNext();

  const handleSwipeLeft = () => {
      if (!currentPhrase || isExiting) return;
      transitionToNext();
  };

  const handleSwipeRight = () => {
    if (isExiting || cardHistory.length === 0) return;
    setIsExiting(true);
    setTimeout(() => {
      const lastPhraseId = cardHistory[cardHistory.length - 1];
      const prevPhrase = allPhrases.find(p => p.id === lastPhraseId);
      if (prevPhrase) {
        setCardHistory(prev => prev.slice(0, -1));
        setIsAnswerRevealed(false);
        changePhrase(prevPhrase, 'left');
      }
      setIsExiting(false);
    }, 250);
  };
  
  // --- Swipe Gesture Handlers ---
  const handleTouchStart = (e: React.TouchEvent) => {
    touchMoveRef.current = null;
    touchStartRef.current = e.targetTouches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchMoveRef.current = e.targetTouches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (touchStartRef.current !== null && touchMoveRef.current !== null) {
      const deltaX = touchMoveRef.current - touchStartRef.current;
      if (deltaX < -SWIPE_THRESHOLD) {
        handleSwipeLeft();
      } else if (deltaX > SWIPE_THRESHOLD) {
        handleSwipeRight();
      }
    }
    touchStartRef.current = null;
    touchMoveRef.current = null;
  };

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

const handleGenerateContinuations = useCallback(
    (russianPhrase: string) => callApiWithFallback(provider => provider.generateSentenceContinuations(russianPhrase)),
    [callApiWithFallback]
);

  const handleGenerateInitialExamples = useCallback(
    (phrase: Phrase) => callApiWithFallback(provider => provider.generateInitialExamples(phrase)),
    [callApiWithFallback]
  );
  
  const handleContinueChat = useCallback(
    (phrase: Phrase, history: any[], newMessage: string) => callApiWithFallback(provider => provider.continueChat(phrase, history, newMessage)),
    [callApiWithFallback]
  );

  const handleGenerateSinglePhrase = useCallback(
    (russianPhrase: string) => callApiWithFallback(provider => provider.generateSinglePhrase(russianPhrase)),
    [callApiWithFallback]
  );

  const handlePhraseCreated = (newPhrase: Phrase) => {
    // Prepend new phrase to make it feel more immediate and avoid seeing the old one first
    updateAndSavePhrases(prev => [newPhrase, ...prev]);
    setIsAnswerRevealed(false);
    changePhrase(newPhrase, 'right');
  };

  // --- Render Logic ---
  const renderButtons = () => {
     if (isAnswerRevealed) {
        return <div className="flex justify-center mt-8"><button onClick={handleContinue} className="px-10 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors font-semibold text-white shadow-md" disabled={isExiting}>Продолжить</button></div>;
     }
     const hasBeenReviewed = currentPhrase?.lastReviewedAt !== null;
     return (
        <div className="flex justify-center space-x-2 sm:space-x-4 mt-8">
            {!hasBeenReviewed && <button onClick={() => handleUpdateMastery('dont_know')} className="px-4 sm:px-6 py-3 rounded-lg bg-yellow-600 hover:bg-yellow-700 transition-colors font-semibold text-white shadow-md">Не знаю</button>}
            <button onClick={() => handleUpdateMastery('forgot')} className="px-4 sm:px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 transition-colors font-semibold text-white shadow-md">Забыл</button>
            <button onClick={() => handleUpdateMastery('know')} className="px-4 sm:px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 transition-colors font-semibold text-white shadow-md">Знаю</button>
        </div>
     );
  };

  const renderContent = () => {
    if (isLoading) return <div className="flex justify-center items-center h-64"><Spinner /></div>;
    if (error) return <div className="text-center bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg max-w-md mx-auto"><p className="font-semibold">Произошла ошибка</p><p className="text-sm">{error}</p></div>;
    if (!currentPhrase) {
        return (
            <div className="text-center text-slate-400 p-4">
                <h2 className="text-2xl font-bold text-white mb-4">Поздравляем!</h2>
                <p>Вы выучили все доступные фразы. Сгенерировать новые?</p>
                <button onClick={() => fetchNewPhrases()} disabled={isGenerating || !apiProvider} className="mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-md text-white font-bold transition-colors disabled:opacity-50">{isGenerating ? 'Генерация...' : 'Сгенерировать фразы'}</button>
            </div>
        );
    }
    const animationClass = isExiting 
      ? (animationState.direction === 'right' ? 'card-exit-left' : 'card-exit-right')
      : (animationState.direction === 'right' ? 'card-enter-right' : 'card-enter-left');

    return (
        <div className="flex flex-col items-center w-full px-2">
            <div 
              className="w-full max-w-md h-64 relative"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
                <div key={animationState.key} className={`absolute inset-0 ${animationClass}`}>
                    <PhraseCard 
                      phrase={currentPhrase} 
                      onSpeak={speak} 
                      isFlipped={isAnswerRevealed} 
                      onOpenChat={openChatForPhrase} 
                      onImproveSkill={handleImproveSkill}
                      onOpenDeepDive={handleOpenDeepDive}
                      onOpenMovieExamples={handleOpenMovieExamples}
                      onWordClick={handleOpenWordAnalysis}
                      onOpenSentenceChain={handleOpenSentenceChain}
                    />
                </div>
            </div>
            {renderButtons()}
        </div>
    );
  }
  
  const getProviderDisplayName = () => {
      if (!apiProvider) return '';
      const name = apiProvider.getProviderName();
      if (name.toLowerCase().includes('gemini')) return 'Google Gemini';
      if (name.toLowerCase().includes('deepseek')) return 'DeepSeek';
      return name;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-4 flex flex-col items-center overflow-x-hidden">
      <header className="w-full absolute top-0 left-0 p-4 flex justify-between items-center z-10">
        <div className="text-left">
           <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Практика немецкого языка</h1>
           <p className="text-slate-400 text-sm">Система интервального повторения</p>
        </div>
        <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 text-slate-400 hover:text-white transition-colors">
            <SettingsIcon className="w-6 h-6" />
        </button>
      </header>
      <main className="w-full flex-grow flex flex-col justify-center items-center">
        {renderContent()}
      </main>
      
      {!isLoading && (
        <button
            onClick={() => setIsAddPhraseModalOpen(true)}
            disabled={!apiProvider}
            className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-4 shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800 z-20 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Добавить новую фразу"
        >
            <PlusIcon className="w-6 h-6" />
        </button>
      )}

      <footer className="text-center text-slate-500 py-4 text-sm h-6">
        {isGenerating ? "Идет генерация новых фраз..." : (apiProvider ? `Powered by ${getProviderDisplayName()}`: "")}
      </footer>
      
      {chatContextPhrase && apiProviderType && <ChatModal 
          isOpen={isChatModalOpen} 
          onClose={() => setIsChatModalOpen(false)} 
          phrase={chatContextPhrase} 
          onSpeak={speak} 
          onGenerateInitialExamples={handleGenerateInitialExamples}
          onContinueChat={handleContinueChat}
          apiProviderType={apiProviderType}
      />}
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} settings={settings} onSettingsChange={handleSettingsChange} />
      {deepDivePhrase && <DeepDiveModal 
        isOpen={isDeepDiveModalOpen} 
        onClose={() => setIsDeepDiveModalOpen(false)} 
        phrase={deepDivePhrase}
        analysis={deepDiveAnalysis}
        isLoading={isDeepDiveLoading}
        error={deepDiveError}
      />}
       {movieExamplesPhrase && <MovieExamplesModal 
        isOpen={isMovieExamplesModalOpen} 
        onClose={() => setIsMovieExamplesModalOpen(false)} 
        phrase={movieExamplesPhrase}
        examples={movieExamples}
        isLoading={isMovieExamplesLoading}
        error={movieExamplesError}
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
        analysis={wordAnalysis}
        isLoading={isWordAnalysisLoading}
        error={wordAnalysisError}
        onOpenVerbConjugation={handleOpenVerbConjugation}
        onOpenNounDeclension={handleOpenNounDeclension}
      />}
      {conjugationVerb && <VerbConjugationModal
        isOpen={isVerbConjugationModalOpen}
        onClose={() => setIsVerbConjugationModalOpen(false)}
        infinitive={conjugationVerb}
        data={verbConjugationData}
        isLoading={isVerbConjugationLoading}
        error={verbConjugationError}
       />}
       {declensionNoun && <NounDeclensionModal
        isOpen={isNounDeclensionModalOpen}
        onClose={() => setIsNounDeclensionModalOpen(false)}
        noun={declensionNoun.noun}
        data={nounDeclensionData}
        isLoading={isNounDeclensionLoading}
        error={nounDeclensionError}
       />}
       {apiProvider && <AddPhraseModal 
          isOpen={isAddPhraseModalOpen} 
          onClose={() => setIsAddPhraseModalOpen(false)}
          onGenerate={handleGenerateSinglePhrase}
          onPhraseCreated={handlePhraseCreated}
      />}
    </div>
  );
};

export default App;