import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import type { Phrase, WordAnalysis } from '../types';
import PhraseCard from '../components/PhraseCard';
import Spinner from '../components/Spinner';
import PracticePageContextMenu from '../components/PracticePageContextMenu';
import CheckIcon from '../components/icons/CheckIcon';
import QuickReplyModal from '../components/QuickReplyModal';
import * as srsService from '../services/srsService';
import * as cacheService from '../services/cacheService';


const SWIPE_THRESHOLD = 50; // pixels

type AnimationDirection = 'left' | 'right';
interface AnimationState {
  key: string;
  direction: AnimationDirection;
}

const W_FRAGEN_POOL = ["Was", "Wer", "Wo", "Wann", "Wie", "Warum", "Woher", "Wohin", "Welcher", "Wie viel", "Wie viele"];
const PRONOUN_POOL = ["ich", "du", "er", "sie", "es", "wir", "ihr", "Sie"];

interface PracticePageProps {
  currentPhrase: Phrase | null;
  isAnswerRevealed: boolean;
  animationState: AnimationState;
  isExiting: boolean;
  unmasteredCount: number;
  fetchNewPhrases: (count?: number) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  isGenerating: boolean;
  apiProviderAvailable: boolean;
  onUpdateMastery: (action: 'know' | 'forgot' | 'dont_know', options?: { autoAdvance?: boolean }) => void;
  onContinue: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onOpenChat: (phrase: Phrase) => void;
  onOpenDeepDive: (phrase: Phrase) => void;
  onOpenMovieExamples: (phrase: Phrase) => void;
  onOpenWordAnalysis: (phrase: Phrase, word: string) => void;
  onOpenSentenceChain: (phrase: Phrase) => void;
  onOpenImprovePhrase: (phrase: Phrase) => void;
  onOpenLearningAssistant: (phrase: Phrase) => void;
  onOpenVoiceWorkspace: (phrase: Phrase) => void;
  onDeletePhrase: (phraseId: string) => void;
  onGoToList: (phrase: Phrase) => void;
  onOpenDiscussTranslation: (phrase: Phrase) => void;
  settings: { 
    dynamicButtonLayout: boolean;
  };
  masteryButtonUsage: { know: number; forgot: number; dont_know: number };
  allPhrases: Phrase[];
  onCreateCard: (phraseData: { german: string; russian: string; }) => void;
  onAnalyzeWord: (phrase: Phrase, word: string) => Promise<WordAnalysis | null>;
  onGenerateQuickReplyOptions: (phrase: Phrase) => Promise<{ options: string[] }>;
  isWordAnalysisLoading: boolean;
}

const PracticePage: React.FC<PracticePageProps> = (props) => {
  const {
    currentPhrase, isAnswerRevealed, animationState, isExiting, unmasteredCount,
    fetchNewPhrases, isLoading, error, isGenerating, apiProviderAvailable,
    onUpdateMastery, onContinue, onSwipeLeft, onSwipeRight,
    onOpenChat, onOpenDeepDive, onOpenMovieExamples, onOpenWordAnalysis,
    onOpenSentenceChain, onOpenImprovePhrase, onOpenLearningAssistant,
    onOpenVoiceWorkspace, onDeletePhrase, onGoToList, onOpenDiscussTranslation,
    settings, masteryButtonUsage, allPhrases, onCreateCard, onAnalyzeWord,
    onGenerateQuickReplyOptions, isWordAnalysisLoading
  } = props;

  const [contextMenuTarget, setContextMenuTarget] = useState<{ phrase: Phrase; word?: string } | null>(null);
  const [quickReplyPhrase, setQuickReplyPhrase] = useState<Phrase | null>(null);
  const [quickReplyOptions, setQuickReplyOptions] = useState<string[]>([]);
  const [isQuickReplyLoading, setIsQuickReplyLoading] = useState(false);
  const [quickReplyError, setQuickReplyError] = useState<string | null>(null);
  const touchStartRef = useRef<number | null>(null);
  const touchMoveRef = useRef<number | null>(null);

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, []);
  
  const isQuickReplyReady = useMemo(() => {
    if (!currentPhrase) return false;
    const category = srsService.getPhraseCategory(currentPhrase);
    
    switch (category) {
        case 'w-frage':
        case 'personal-pronoun':
            return true; // These are hardcoded, always ready.
        case 'short-phrase':
            // This is the crucial check: only ready if data is in cache.
            const cacheKey = `quick_reply_options_${currentPhrase.id}`;
            return !!cacheService.getCache<string[]>(cacheKey);
        default:
            return false;
    }
  }, [currentPhrase]);


  const handleOpenQuickReply = useCallback(async (phraseToReply: Phrase) => {
    setQuickReplyPhrase(phraseToReply);
    setQuickReplyError(null);
    setQuickReplyOptions([]);
    setIsQuickReplyLoading(true);

    try {
        const category = srsService.getPhraseCategory(phraseToReply);
        const correctAnswer = phraseToReply.german.replace(/[?]/g, '');
        let distractors: string[] = [];

        if (category === 'w-frage') {
            distractors = W_FRAGEN_POOL
                .filter(p => p !== correctAnswer)
                .sort(() => 0.5 - Math.random())
                .slice(0, 3);
        } else if (category === 'personal-pronoun') {
            distractors = PRONOUN_POOL
                .filter(p => p !== correctAnswer)
                .sort(() => 0.5 - Math.random())
                .slice(0, 3);
        } else if (category === 'short-phrase') {
            const cacheKey = `quick_reply_options_${phraseToReply.id}`;
            const cachedDistractors = cacheService.getCache<string[]>(cacheKey);

            if (cachedDistractors) {
                distractors = cachedDistractors;
            } else {
                // This case should ideally not be hit if the UI is controlled by `isQuickReplyReady`
                console.error("Attempted to open quick reply for a short-phrase without cached options.");
                setQuickReplyError("Варианты ответа еще не загружены. Попробуйте через секунду.");
                setIsQuickReplyLoading(false);
                return;
            }
        } else {
             throw new Error("Неподходящая категория фразы для быстрого ответа.");
        }
          
        const options = [correctAnswer, ...distractors].sort(() => 0.5 - Math.random());
        setQuickReplyOptions(options);
        setIsQuickReplyLoading(false);

    } catch (error) {
        console.error("Failed to prepare quick reply options:", error);
        setQuickReplyError(error instanceof Error ? error.message : "Не удалось загрузить варианты.");
        setIsQuickReplyLoading(false);
    }
  }, []);
  
  const handleQuickReplyCorrect = useCallback(() => {
    if (!quickReplyPhrase) return;
    onUpdateMastery('know', { autoAdvance: true });
    onContinue();
    setQuickReplyPhrase(null);
  }, [quickReplyPhrase, onUpdateMastery, onContinue]);

  const handleQuickReplyIncorrect = useCallback(() => {
    if (!quickReplyPhrase) return;
    onUpdateMastery('forgot');
    setQuickReplyPhrase(null);
  }, [quickReplyPhrase, onUpdateMastery]);

  const handleMasteryButtonClick = (action: 'know' | 'forgot' | 'dont_know') => {
    if (isExiting) return;
    
    const shouldAutoAdvance = action === 'know';
    onUpdateMastery(action, { autoAdvance: shouldAutoAdvance });

    if (shouldAutoAdvance) {
      // Don't wait for card to flip, immediately start transition to next card
      onContinue();
    }
  };
  
  const handleTouchStart = (e: React.TouchEvent) => { touchMoveRef.current = null; touchStartRef.current = e.targetTouches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => { touchMoveRef.current = e.targetTouches[0].clientX; };
  const handleTouchEnd = () => {
    if (touchStartRef.current !== null && touchMoveRef.current !== null) {
      const deltaX = touchMoveRef.current - touchStartRef.current;
      if (deltaX < -SWIPE_THRESHOLD) onSwipeLeft();
      else if (deltaX > SWIPE_THRESHOLD) onSwipeRight();
    }
    touchStartRef.current = null; touchMoveRef.current = null;
  };

  const renderButtons = () => {
     if (isAnswerRevealed) {
        return (
            <div className="flex justify-center mt-8 h-12">
                <button
                    onClick={onContinue}
                    disabled={isExiting}
                    className="px-10 py-3 rounded-lg font-semibold text-white shadow-md transition-all duration-300 bg-purple-600 hover:bg-purple-700"
                >
                    Продолжить
                </button>
            </div>
        );
     }
     
     if (!currentPhrase) {
       return <div className="mt-8 h-12" />;
     }

     const phraseCategory = srsService.getPhraseCategory(currentPhrase);
     const isExcludedCategory = phraseCategory === 'w-frage' || phraseCategory === 'personal-pronoun';
     
     if (isExcludedCategory) {
         return <div className="mt-8 h-12" />;
     }
     
     const hasBeenReviewed = currentPhrase.lastReviewedAt !== null;
     
     // For regular phrases, show the full set
     if (phraseCategory === 'regular' || phraseCategory === null) {
         const allButtons = [
            { key: 'dont_know' as const, label: 'Не знаю', className: 'bg-yellow-600 hover:bg-yellow-700', condition: !hasBeenReviewed },
            { key: 'forgot' as const, label: 'Забыл', className: 'bg-red-600 hover:bg-red-700', condition: hasBeenReviewed },
            { key: 'know' as const, label: 'Знаю', className: 'bg-green-600 hover:bg-green-700', condition: true },
         ];
         let buttonsToRender = allButtons.filter(btn => btn.condition);
         if (settings.dynamicButtonLayout) {
             buttonsToRender.sort((a, b) => (masteryButtonUsage[a.key] || 0) - (masteryButtonUsage[b.key] || 0));
         }

         return (
            <div className="flex justify-center space-x-2 sm:space-x-4 mt-8 h-12">
                 {buttonsToRender.map(btn => (
                    <button 
                        key={btn.key} 
                        onClick={() => handleMasteryButtonClick(btn.key)} 
                        className={`px-4 sm:px-6 py-3 rounded-lg font-semibold text-white shadow-md transition-colors ${btn.className}`}
                    >
                        {btn.label}
                    </button>
                ))}
            </div>
         );
     }
     
     // For short phrases, only show the "Forgot"/"Don't Know" button
     if (phraseCategory === 'short-phrase') {
         const buttonKey = hasBeenReviewed ? 'forgot' : 'dont_know';
         const buttonLabel = hasBeenReviewed ? 'Забыл' : 'Не знаю';
         const buttonClass = hasBeenReviewed ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700';
         
         return (
             <div className="flex justify-center mt-8 h-12">
                 <button 
                     key={buttonKey} 
                     onClick={() => handleMasteryButtonClick(buttonKey)} 
                     className={`px-4 sm:px-6 py-3 rounded-lg font-semibold text-white shadow-md transition-colors ${buttonClass}`}
                 >
                     {buttonLabel}
                 </button>
             </div>
         );
     }
     
     return <div className="mt-8 h-12" />;
  };

  const renderContent = () => {
    if (isLoading) return <div className="flex justify-center items-center h-64"><Spinner /></div>;
    if (error) return <div className="text-center bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg max-w-md mx-auto"><p className="font-semibold">Произошла ошибка</p><p className="text-sm">{error}</p></div>;
    if (!currentPhrase) {
      if (unmasteredCount === 0) {
        return (
            <div className="text-center text-slate-400 p-4">
                <h2 className="text-2xl font-bold text-white mb-4">Поздравляем!</h2>
                <p>Вы выучили все доступные фразы. Сгенерировать новые?</p>
                <button onClick={() => fetchNewPhrases()} disabled={isGenerating || !apiProviderAvailable} className="mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-md text-white font-bold transition-colors disabled:opacity-50">{isGenerating ? 'Генерация...' : 'Сгенерировать фразы'}</button>
            </div>
        );
      }
      return <div className="flex justify-center items-center h-64"><Spinner /></div>;
    }
    const animationClass = isExiting 
      ? (animationState.direction === 'right' ? 'card-exit-left' : 'card-exit-right')
      : (animationState.direction === 'right' ? 'card-enter-right' : 'card-enter-left');

    return (
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
                      isQuickReplyReady={isQuickReplyReady}
                    />
                </div>
            </div>
            {renderButtons()}
        </div>
    );
  }

  return (
    <>
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
