
import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import type { Phrase, WordAnalysis, PhraseCategory, Category } from '../types';
import PhraseCard from '../components/PhraseCard';
import PhraseCardSkeleton from '../components/PhraseCardSkeleton';
import PracticePageContextMenu from '../components/PracticePageContextMenu';
import CheckIcon from '../components/icons/CheckIcon';
import QuickReplyModal from '../components/QuickReplyModal';
import * as srsService from '../services/srsService';
import * as cacheService from '../services/cacheService';
import { playCorrectSound } from '../services/soundService';
import ArrowLeftIcon from '../components/icons/ArrowLeftIcon';
import ArrowRightIcon from '../components/icons/ArrowRightIcon';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import PlusIcon from '../components/icons/PlusIcon';
import SettingsIcon from '../components/icons/SettingsIcon';


const SWIPE_THRESHOLD = 50; // pixels

type AnimationDirection = 'left' | 'right';
interface AnimationState {
  key: string;
  direction: AnimationDirection;
}

// Pools for local quick reply generation
const W_FRAGEN_POOL = ["Was?", "Wer?", "Wo?", "Wann?", "Wie?", "Warum?", "Woher?", "Wohin?", "Welcher?", "Wie viel?", "Wie viele?"];
const PRONOUN_POOL = ["ich", "du", "er", "sie", "es", "wir", "ihr", "Sie", "mich", "dich", "ihn", "mir", "dir", "ihm", "ihnen", "mein", "dein", "sein"];
const NUMBERS_POOL = ["null", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "elf", "zwölf", "zwanzig", "hundert"];
const TIME_POOL = ["Montag", "Dienstag", "Januar", "Februar", "Wie spät ist es?", "Es ist ein Uhr.", "Es ist zwei Uhr.", "Es ist halb eins.", "Es ist halb drei.", "Es ist Viertel nach vier.", "Es ist Viertel vor sechs."];
const MONEY_POOL = ["Was kostet das?", "Das kostet zehn Euro.", "dreiundzwanzig Euro fünfundsiebzig", "zwölf Dollar fünfzig", "Haben Sie Wechselgeld für fünfzig Euro?", "Ich möchte bezahlen."];


interface PracticePageProps {
  currentPhrase: Phrase | null;
  isAnswerRevealed: boolean;
  onSetIsAnswerRevealed: React.Dispatch<React.SetStateAction<boolean>>;
  isCardEvaluated: boolean;
  animationState: AnimationState;
  isExiting: boolean;
  unmasteredCount: number;
  currentPoolCount: number;
  fetchNewPhrases: (count?: number) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  isGenerating: boolean;
  apiProviderAvailable: boolean;
  onUpdateMastery: (action: 'know' | 'forgot' | 'dont_know') => void;
  onUpdateMasteryWithoutUI: (phrase: Phrase, action: 'know' | 'forgot' | 'dont_know') => void;
  onContinue: () => void;
  onSwipeRight: () => void;
  onOpenChat: (phrase: Phrase) => void;
  onOpenDeepDive: (phrase: Phrase) => void;
  onOpenMovieExamples: (phrase: Phrase) => void;
  onOpenWordAnalysis: (phrase: Phrase, word: string) => void;
  onOpenVerbConjugation: (infinitive: string) => void;
  onOpenNounDeclension: (noun: string, article: string) => void;
  onOpenAdjectiveDeclension: (adjective: string) => void;
  onOpenSentenceChain: (phrase: Phrase) => void;
  onOpenImprovePhrase: (phrase: Phrase) => void;
  onOpenLearningAssistant: (phrase: Phrase) => void;
  onOpenVoiceWorkspace: (phrase: Phrase) => void;
  onDeletePhrase: (phraseId: string) => void;
  onGoToList: (phrase: Phrase) => void;
  onOpenDiscussTranslation: (phrase: Phrase) => void;
  settings: { 
    soundEffects: boolean;
    autoSpeak: boolean;
    enabledCategories: Record<PhraseCategory, boolean>;
  };
  masteryButtonUsage: { know: number; forgot: number; dont_know: number };
  allPhrases: Phrase[];
  onCreateCard: (phraseData: { german: string; russian: string; }) => void;
  onAnalyzeWord: (phrase: Phrase, word: string) => Promise<WordAnalysis | null>;
  onGenerateQuickReplyOptions: (phrase: Phrase) => Promise<{ options: string[] }>;
  isWordAnalysisLoading: boolean;
  cardActionUsage: { [key: string]: number };
  onLogCardActionUsage: (button: string) => void;
  cardHistoryLength: number;
  practiceCategoryFilter: 'all' | PhraseCategory;
  setPracticeCategoryFilter: (filter: 'all' | PhraseCategory) => void;
  onMarkPhraseAsSeen: (phraseId: string) => void;
  categories: Category[];
  onAddCategory: () => void;
  onOpenCategoryManager: () => void;
  unmasteredCountsByCategory: Record<string, number>;
}

const CategoryFilter: React.FC<{
    currentFilter: 'all' | PhraseCategory;
    onFilterChange: (filter: 'all' | PhraseCategory) => void;
    enabledCategories: Record<PhraseCategory, boolean>;
    currentPhraseCategory: PhraseCategory | null;
    categories: Category[];
    onAddCategory: () => void;
    onManageCategories: () => void;
    counts: Record<string, number>;
    totalUnmastered: number;
}> = ({ currentFilter, onFilterChange, enabledCategories, currentPhraseCategory, categories, onAddCategory, onManageCategories, counts, totalUnmastered }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const getCategoryNameById = (id: string) => categories.find(c => c.id === id)?.name || id;

    const categoryName = currentFilter === 'all' 
        ? 'Все категории' 
        : getCategoryNameById(currentFilter);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const handleSelect = (filter: 'all' | PhraseCategory) => {
        onFilterChange(filter);
        setIsOpen(false);
    };

    const handleAddCategory = () => {
        onAddCategory();
        setIsOpen(false);
    };

    const handleManageCategories = () => {
        onManageCategories();
        setIsOpen(false);
    };
    
    const visibleCategories = categories.filter(cat => enabledCategories[cat.id]);

    return (
        <div ref={dropdownRef} className="relative w-full max-w-sm mx-auto mb-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-center px-4 py-2 bg-transparent hover:bg-slate-700/80 rounded-lg text-slate-300 transition-colors"
            >
                <span className="font-semibold mr-2">
                    {currentFilter === 'all' && currentPhraseCategory ? getCategoryNameById(currentPhraseCategory) : categoryName}
                </span>
                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute top-full mt-2 w-full bg-slate-700 border border-slate-600 rounded-lg shadow-lg z-20 animate-fade-in flex flex-col">
                    <ul className="p-1 max-h-60 overflow-y-auto hide-scrollbar">
                        <li>
                            <button onClick={() => handleSelect('all')} className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-600 rounded-md transition-colors flex justify-between items-center">
                                <span>Все категории</span>
                                <span className="text-xs font-semibold text-slate-400 bg-slate-800/50 px-1.5 py-0.5 rounded-full">{totalUnmastered}</span>
                            </button>
                        </li>
                        {visibleCategories.map(cat => (
                            <li key={cat.id}>
                                <button onClick={() => handleSelect(cat.id)} className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-600 rounded-md transition-colors flex justify-between items-center">
                                    <span className="truncate pr-2">{cat.name}</span>
                                    <span className="text-xs font-semibold text-slate-400 bg-slate-800/50 px-1.5 py-0.5 rounded-full flex-shrink-0">{counts[cat.id] || 0}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                    <div className="p-1 border-t border-slate-600 flex-shrink-0 grid grid-cols-2 gap-1">
                         <button onClick={handleAddCategory} className="flex items-center justify-center gap-2 px-2 py-2 text-slate-300 hover:bg-slate-600 rounded-md transition-colors text-sm font-semibold">
                            <PlusIcon className="w-4 h-4" />
                            <span>Добавить</span>
                        </button>
                        <button onClick={handleManageCategories} className="flex items-center justify-center gap-2 px-2 py-2 text-slate-300 hover:bg-slate-600 rounded-md transition-colors text-sm font-semibold">
                            <SettingsIcon className="w-4 h-4" />
                            <span>Управлять</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


const PracticePage: React.FC<PracticePageProps> = (props) => {
  const {
    currentPhrase, isAnswerRevealed, onSetIsAnswerRevealed, isCardEvaluated, animationState, isExiting, unmasteredCount, currentPoolCount,
    fetchNewPhrases, isLoading, error, isGenerating, apiProviderAvailable,
    onUpdateMastery, onUpdateMasteryWithoutUI, onContinue, onSwipeRight,
    onOpenChat, onOpenDeepDive, onOpenMovieExamples, onOpenWordAnalysis,
    onOpenVerbConjugation, onOpenNounDeclension, onOpenAdjectiveDeclension,
    onOpenSentenceChain, onOpenImprovePhrase, onOpenLearningAssistant,
    onOpenVoiceWorkspace, onDeletePhrase, onGoToList, onOpenDiscussTranslation,
    settings, masteryButtonUsage, allPhrases, onCreateCard, onAnalyzeWord,
    onGenerateQuickReplyOptions, isWordAnalysisLoading, cardActionUsage, onLogCardActionUsage,
    cardHistoryLength, practiceCategoryFilter, setPracticeCategoryFilter, onMarkPhraseAsSeen,
    categories, onAddCategory, onOpenCategoryManager, unmasteredCountsByCategory
  } = props;

  const [contextMenuTarget, setContextMenuTarget] = useState<{ phrase: Phrase; word?: string } | null>(null);
  const [quickReplyPhrase, setQuickReplyPhrase] = useState<Phrase | null>(null);
  const [quickReplyOptions, setQuickReplyOptions] = useState<string[]>([]);
  const [isQuickReplyLoading, setIsQuickReplyLoading] = useState(false);
  const [quickReplyError, setQuickReplyError] = useState<string | null>(null);
  const [flashState, setFlashState] = useState<'green' | null>(null);
  const touchStartRef = useRef<number | null>(null);
  const touchMoveRef = useRef<number | null>(null);

  useEffect(() => {
    if (currentPhrase && currentPhrase.isNew) {
      onMarkPhraseAsSeen(currentPhrase.id);
    }
  }, [currentPhrase, onMarkPhraseAsSeen]);

  const speak = useCallback((text: string, lang: 'de-DE' | 'ru-RU') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, []);
  
  const isQuickReplyEligible = useMemo(() => {
    if (!currentPhrase) return false;
    const { category, german } = currentPhrase;
    const wordCount = german.split(' ').filter(Boolean).length;
    // Any foundational category is eligible, plus short general phrases.
    return category !== 'general' || wordCount <= 2;
  }, [currentPhrase]);


  const handleOpenQuickReply = useCallback(async (phraseToReply: Phrase) => {
    setQuickReplyPhrase(phraseToReply);
    setQuickReplyError(null);
    setQuickReplyOptions([]);
    setIsQuickReplyLoading(true);

    try {
        const { category } = phraseToReply;
        const correctAnswer = phraseToReply.german.replace(/[?]/g, '');
        let distractors: string[] = [];
        
        const categoryDetails = categories.find(c => c.id === category);
        const isFoundational = categoryDetails?.isFoundational;

        if (isFoundational) {
            // INSTANT LOCAL GENERATION
            setIsQuickReplyLoading(false); 
            let pool: string[] = [];
            switch(category) {
                case 'w-fragen': pool = W_FRAGEN_POOL.map(p => p.replace(/[?]/g, '')); break;
                case 'pronouns': pool = PRONOUN_POOL; break;
                case 'numbers': pool = NUMBERS_POOL; break;
                case 'time': pool = TIME_POOL; break;
                case 'money': pool = MONEY_POOL; break;
            }
            
             distractors = pool
                .filter(p => p.toLowerCase() !== correctAnswer.toLowerCase())
                .sort(() => 0.5 - Math.random())
                .slice(0, 3);
            
            if (distractors.length < 3) {
                const genericDistractors = ["Hallo", "Danke", "Bitte", "Ja", "Nein", "Gut"];
                const needed = 3 - distractors.length;
                distractors.push(
                    ...genericDistractors
                        .filter(d => d.toLowerCase() !== correctAnswer.toLowerCase() && !distractors.includes(d))
                        .slice(0, needed)
                );
            }

            const options = [correctAnswer, ...distractors].sort(() => 0.5 - Math.random());
            setQuickReplyOptions(options);

        } else { // 'general' category - use AI
            const cacheKey = `quick_reply_options_${phraseToReply.id}`;
            const cachedDistractors = cacheService.getCache<string[]>(cacheKey);

            if (cachedDistractors) {
                distractors = cachedDistractors;
            } else {
                const result = await onGenerateQuickReplyOptions(phraseToReply);
                if (result.options && result.options.length > 0) {
                    distractors = result.options;
                    cacheService.setCache(cacheKey, distractors);
                } else {
                    throw new Error("Не удалось сгенерировать варианты ответа.");
                }
            }
            const options = [correctAnswer, ...distractors].sort(() => 0.5 - Math.random());
            setQuickReplyOptions(options);
            setIsQuickReplyLoading(false);
        }
    } catch (error) {
        console.error("Failed to prepare quick reply options:", error);
        setQuickReplyError(error instanceof Error ? error.message : "Не удалось загрузить варианты.");
        setIsQuickReplyLoading(false);
    }
  }, [onGenerateQuickReplyOptions, categories]);
  
  const handleQuickReplyCorrect = useCallback(() => {
    if (!quickReplyPhrase) return;

    if (settings.autoSpeak) {
      speak(quickReplyPhrase.german, 'de-DE');
    }
    
    onUpdateMasteryWithoutUI(quickReplyPhrase, 'know');
    onContinue();
    setQuickReplyPhrase(null);
  }, [quickReplyPhrase, onUpdateMasteryWithoutUI, onContinue, settings.autoSpeak, speak]);

  const handleQuickReplyIncorrect = useCallback(() => {
    if (!quickReplyPhrase) return;
    onUpdateMastery('forgot');
    setQuickReplyPhrase(null);
  }, [quickReplyPhrase, onUpdateMastery]);
  
  const handleTouchStart = (e: React.TouchEvent) => { touchMoveRef.current = null; touchStartRef.current = e.targetTouches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => { touchMoveRef.current = e.targetTouches[0].clientX; };
  const handleTouchEnd = () => {
    if (touchStartRef.current !== null && touchMoveRef.current !== null) {
      const deltaX = touchMoveRef.current - touchStartRef.current;
      if (deltaX < -SWIPE_THRESHOLD) onContinue();
      else if (deltaX > SWIPE_THRESHOLD) onSwipeRight();
    }
    touchStartRef.current = null; touchMoveRef.current = null;
  };

  const handleKnowClick = useCallback(() => {
    if (isExiting || !currentPhrase) return;
    
    setFlashState('green');
    onUpdateMastery('know');
    
    // Auto-advance after showing the answer
    setTimeout(() => {
      onContinue();
    }, 1500);
  }, [isExiting, currentPhrase, onUpdateMastery, onContinue]);

  const renderContent = () => {
    if (isLoading) return <PhraseCardSkeleton />;
    if (error) return <div className="text-center bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg max-w-md mx-auto"><p className="font-semibold">Произошла ошибка</p><p className="text-sm">{error}</p></div>;
    if (!currentPhrase) {
      if (unmasteredCount === 0 && practiceCategoryFilter === 'all') {
        return (
            <div className="text-center text-slate-400 p-4">
                <h2 className="text-2xl font-bold text-white mb-4">Поздравляем!</h2>
                <p>Вы выучили все фразы в выбранных категориях.</p>
                <button onClick={() => fetchNewPhrases()} disabled={isGenerating || !apiProviderAvailable} className="mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-md text-white font-bold transition-colors disabled:opacity-50">{isGenerating ? 'Генерация...' : 'Сгенерировать новые'}</button>
            </div>
        );
      }
       if (currentPoolCount === 0) {
        const categoryName = categories.find(c => c.id === practiceCategoryFilter)?.name || 'этой';
        return (
            <div className="text-center text-slate-400 p-4">
                <h2 className="text-2xl font-bold text-white mb-4">Пусто</h2>
                <p>Нет невыученных карточек в категории "{categoryName}".</p>
                <button onClick={() => setPracticeCategoryFilter('all')} className="mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-md text-white font-bold transition-colors">
                    Практиковать все категории
                </button>
            </div>
        );
      }
      return <PhraseCardSkeleton />;
    }
    const animationClass = isExiting 
      ? (animationState.direction === 'right' ? 'card-exit-left' : 'card-exit-right')
      : (animationState.direction === 'right' ? 'card-enter-right' : 'card-enter-left');

    return (
        <div className="relative w-full max-w-2xl flex items-center justify-center">
             {currentPhrase && (
                <>
                    <button
                        onClick={onSwipeRight}
                        disabled={cardHistoryLength === 0}
                        className="hidden md:flex absolute top-1/2 left-0 -translate-y-1/2 w-12 h-12 bg-slate-800/50 hover:bg-slate-700/80 rounded-full items-center justify-center transition-colors text-slate-300 hover:text-white z-10 disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Предыдущая карта"
                    >
                        <ArrowLeftIcon className="w-6 h-6" />
                    </button>
                    <button
                        onClick={onContinue}
                        disabled={unmasteredCount <= 1}
                        className="hidden md:flex absolute top-1/2 right-0 -translate-y-1/2 w-12 h-12 bg-slate-800/50 hover:bg-slate-700/80 rounded-full items-center justify-center transition-colors text-slate-300 hover:text-white z-10 disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Следующая карта"
                    >
                        <ArrowRightIcon className="w-6 h-6" />
                    </button>
                </>
            )}
            <div className="flex flex-col items-center w-full px-2">
                <div
                  id="practice-card-container"
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
                          onFlip={() => onSetIsAnswerRevealed(true)}
                          onOpenChat={onOpenChat} 
                          onOpenDeepDive={onOpenDeepDive}
                          onOpenMovieExamples={onOpenMovieExamples}
                          onWordClick={onOpenWordAnalysis}
                          onOpenSentenceChain={onOpenSentenceChain}
                          onOpenImprovePhrase={onOpenImprovePhrase}
                          onOpenContextMenu={setContextMenuTarget}
                          onOpenVoicePractice={onOpenVoiceWorkspace}
                          onOpenLearningAssistant={onOpenLearningAssistant}
                          onOpenQuickReply={handleOpenQuickReply}
                          isWordAnalysisLoading={isWordAnalysisLoading}
                          isQuickReplyEligible={isQuickReplyEligible}
                          cardActionUsage={cardActionUsage}
                          onLogCardActionUsage={onLogCardActionUsage}
                          flash={flashState}
                          onFlashEnd={() => setFlashState(null)}
                        />
                    </div>
                </div>

                <div className="flex justify-center items-center mt-8 h-12">
                    {!isAnswerRevealed && currentPhrase && (
                        <button
                            onClick={handleKnowClick}
                            disabled={isExiting}
                            className="w-full max-w-[200px] mx-auto px-10 py-3 rounded-lg font-semibold text-white shadow-md transition-colors bg-green-600 hover:bg-green-700 animate-fade-in"
                        >
                            Знаю
                        </button>
                    )}
                    {/* This button appears ONLY when the card is manually flipped to check the answer */}
                    {isAnswerRevealed && !isCardEvaluated && (
                        <button
                            onClick={onContinue}
                            disabled={isExiting}
                            className="px-10 py-3 rounded-lg font-semibold text-white shadow-md transition-all duration-300 bg-purple-600 hover:bg-purple-700 animate-fade-in"
                        >
                            Продолжить
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
  }

  return (
    <>
      <CategoryFilter
        currentFilter={practiceCategoryFilter}
        onFilterChange={setPracticeCategoryFilter}
        enabledCategories={settings.enabledCategories}
        currentPhraseCategory={currentPhrase?.category || null}
        categories={categories}
        onAddCategory={onAddCategory}
        onManageCategories={onOpenCategoryManager}
        counts={unmasteredCountsByCategory}
        totalUnmastered={unmasteredCount}
      />
      {renderContent()}
      {contextMenuTarget && (
        <PracticePageContextMenu
          target={contextMenuTarget}
          onClose={() => setContextMenuTarget(null)}
          onDelete={onDeletePhrase}
          onGoToList={onGoToList}
          onDiscuss={onOpenDiscussTranslation}
          onCreateCard={onCreateCard}
          onAnalyzeWord={onAnalyzeWord}
          onOpenWordAnalysis={onOpenWordAnalysis}
          onOpenVerbConjugation={onOpenVerbConjugation}
          onOpenNounDeclension={onOpenNounDeclension}
          onOpenAdjectiveDeclension={onOpenAdjectiveDeclension}
        />
      )}
      {quickReplyPhrase && (
        <QuickReplyModal
          isOpen={!!quickReplyPhrase}
          onClose={() => setQuickReplyPhrase(null)}
          phrase={quickReplyPhrase}
          options={quickReplyOptions}
          correctAnswer={quickReplyPhrase.german}
          onCorrect={handleQuickReplyCorrect}
          onIncorrect={handleQuickReplyIncorrect}
          isLoading={isQuickReplyLoading}
          error={quickReplyError}
        />
      )}
    </>
  );
};

export default PracticePage;
