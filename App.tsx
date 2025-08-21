import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Phrase, DeepDiveAnalysis, MovieExample, WordAnalysis, VerbConjugation, NounDeclension, SentenceContinuation } from './types';
import * as srsService from './services/srsService';
import * as cacheService from './services/cacheService';
import { getProviderPriorityList, getFallbackProvider, ApiProviderType } from './services/apiProvider';
import { AiService } from './services/aiService';
import { initialPhrases as defaultPhrases } from './data/initialPhrases';

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
import PlusIcon from './components/icons/PlusIcon';

const PHRASES_STORAGE_KEY = 'germanPhrases';
const SETTINGS_STORAGE_KEY = 'germanAppSettings';

type View = 'practice' | 'list';

const App: React.FC = () => {
  const [allPhrases, setAllPhrases] = useState<Phrase[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('practice');
  const [practicePhraseOverride, setPracticePhraseOverride] = useState<Phrase | null>(null);
  
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
  
  const [isImproveModalOpen, setIsImproveModalOpen] = useState(false);
  const [phraseToImprove, setPhraseToImprove] = useState<Phrase | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [phraseToEdit, setPhraseToEdit] = useState<Phrase | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [phraseToDelete, setPhraseToDelete] = useState<Phrase | null>(null);

  const [apiProvider, setApiProvider] = useState<AiService | null>(null);
  const [apiProviderType, setApiProviderType] = useState<ApiProviderType | null>(null);

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
            if (storedSettings) setSettings(JSON.parse(storedSettings));
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

  const handleGenerateContinuations = useCallback((russianPhrase: string) => callApiWithFallback(provider => provider.generateSentenceContinuations(russianPhrase)),[callApiWithFallback]);
  const handleGenerateInitialExamples = useCallback((phrase: Phrase) => callApiWithFallback(provider => provider.generateInitialExamples(phrase)),[callApiWithFallback]);
  const handleContinueChat = useCallback((phrase: Phrase, history: any[], newMessage: string) => callApiWithFallback(provider => provider.continueChat(phrase, history, newMessage)),[callApiWithFallback]);
  const handleGenerateSinglePhrase = useCallback((russianPhrase: string) => callApiWithFallback(provider => provider.generateSinglePhrase(russianPhrase)),[callApiWithFallback]);

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
    setIsAddPhraseModalOpen(false);
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
        setIsDeleteModalOpen(false);
        setPhraseToDelete(null);
    }
  }, [phraseToDelete, updateAndSavePhrases]);

  const handleStartPracticeWithPhrase = (phraseToPractice: Phrase) => {
    setPracticePhraseOverride(phraseToPractice);
    setView('practice');
  };

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
      <main className="w-full flex-grow flex flex-col justify-center items-center">
        {view === 'practice' ? (
           <PracticePage
             allPhrases={allPhrases}
             updateAndSavePhrases={updateAndSavePhrases}
             fetchNewPhrases={fetchNewPhrases}
             isLoading={isLoading}
             error={error}
             isGenerating={isGenerating}
             settings={settings}
             apiProviderAvailable={!!apiProvider}
             practicePhraseOverride={practicePhraseOverride}
             onPracticePhraseConsumed={() => setPracticePhraseOverride(null)}
             onOpenChat={openChatForPhrase}
             onOpenDeepDive={handleOpenDeepDive}
             onOpenMovieExamples={handleOpenMovieExamples}
             onOpenWordAnalysis={handleOpenWordAnalysis}
             onOpenSentenceChain={handleOpenSentenceChain}
             onOpenImprovePhrase={handleOpenImproveModal}
           />
        ) : (
          <PhraseListPage 
            phrases={allPhrases}
            onEditPhrase={handleOpenEditModal}
            onDeletePhrase={handleDeletePhrase}
            onFindDuplicates={handleFindDuplicates}
            updateAndSavePhrases={updateAndSavePhrases}
            onStartPractice={handleStartPracticeWithPhrase}
          />
        )}
      </main>
      
      {view === 'practice' && !isLoading && (
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
       />}
       <ConfirmDeleteModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={handleConfirmDelete}
            phrase={phraseToDelete}
       />
    </div>
  );
};

export default App;
