import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Phrase } from '../types';
import * as srsService from '../services/srsService';
import PhraseCard from '../components/PhraseCard';
import Spinner from '../components/Spinner';

const ACTIVE_POOL_TARGET = 10;
const POOL_FETCH_THRESHOLD = 7; 
const PHRASES_TO_FETCH = 5; 
const SWIPE_THRESHOLD = 50; // pixels

type AnimationDirection = 'left' | 'right';
interface AnimationState {
  key: string;
  direction: AnimationDirection;
}

interface PracticePageProps {
  allPhrases: Phrase[];
  updateAndSavePhrases: (updater: (prevPhrases: Phrase[]) => Phrase[]) => void;
  fetchNewPhrases: (count?: number) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  isGenerating: boolean;
  settings: { autoSpeak: boolean };
  apiProviderAvailable: boolean;
  practicePhraseOverride: Phrase | null;
  onPracticePhraseConsumed: () => void;
  onOpenChat: (phrase: Phrase) => void;
  onOpenDeepDive: (phrase: Phrase) => void;
  onOpenMovieExamples: (phrase: Phrase) => void;
  onOpenWordAnalysis: (phrase: Phrase, word: string) => void;
  onOpenSentenceChain: (phrase: Phrase) => void;
  onOpenImprovePhrase: (phrase: Phrase) => void;
  onOpenPhraseBuilder: (phrase: Phrase) => void;
}

const PracticePage: React.FC<PracticePageProps> = (props) => {
  const {
    allPhrases, updateAndSavePhrases, fetchNewPhrases, isLoading, error, isGenerating, settings,
    apiProviderAvailable, practicePhraseOverride, onPracticePhraseConsumed, onOpenChat, onOpenDeepDive,
    onOpenMovieExamples, onOpenWordAnalysis, onOpenSentenceChain, onOpenImprovePhrase, onOpenPhraseBuilder
  } = props;

  const [currentPhrase, setCurrentPhrase] = useState<Phrase | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [isExiting, setIsExiting] = useState<boolean>(false);
  
  const [animationState, setAnimationState] = useState<AnimationState>({ key: '', direction: 'right' });
  const [cardHistory, setCardHistory] = useState<string[]>([]);
  
  const touchStartRef = useRef<number | null>(null);
  const touchMoveRef = useRef<number | null>(null);

  const unmasteredPhrases = React.useMemo(() => allPhrases.filter(p => p && !p.isMastered), [allPhrases]);

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

  // Effect to handle external deletion of the current phrase
  useEffect(() => {
    if (currentPhrase && !allPhrases.some(p => p && p.id === currentPhrase.id)) {
        // The current phrase has been deleted from the main list.
        // Select the next available phrase to avoid errors.
        selectNext(false); 
    }
  }, [allPhrases, currentPhrase, selectNext]);
  
  // Effect to handle external updates (e.g., from Phrase Builder)
  useEffect(() => {
    if (currentPhrase) {
        const freshPhraseInList = allPhrases.find(p => p.id === currentPhrase.id);
        // If the phrase in the main list has a different review timestamp
        // than the one we hold in our state, it means an external action (like Phrase Builder) happened.
        if (freshPhraseInList && freshPhraseInList.lastReviewedAt !== currentPhrase.lastReviewedAt) {
            transitionToNext();
        }
    }
  }, [allPhrases, currentPhrase]);


  useEffect(() => {
    if (practicePhraseOverride) {
      // If there's an override, use it as the first phrase
      changePhrase(practicePhraseOverride, 'right');
      setIsAnswerRevealed(false);
      onPracticePhraseConsumed(); // Tell App.tsx we've used it
    } else if (!isLoading && allPhrases.length > 0 && !currentPhrase) {
      // Otherwise, use the normal SRS logic
      selectNext(false);
    }
  }, [isLoading, allPhrases, currentPhrase, practicePhraseOverride, onPracticePhraseConsumed, selectNext, changePhrase]);

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
      if (deltaX < -SWIPE_THRESHOLD) handleSwipeLeft();
      else if (deltaX > SWIPE_THRESHOLD) handleSwipeRight();
    }
    touchStartRef.current = null;
    touchMoveRef.current = null;
  };

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
                <button onClick={() => fetchNewPhrases()} disabled={isGenerating || !apiProviderAvailable} className="mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-md text-white font-bold transition-colors disabled:opacity-50">{isGenerating ? 'Генерация...' : 'Сгенерировать фразы'}</button>
            </div>
        );
    }
    const animationClass = isExiting 
      ? (animationState.direction === 'right' ? 'card-exit-left' : 'card-exit-right')
      : (animationState.direction === 'right' ? 'card-enter-right' : 'card-enter-left');

    return (
        <div className="flex flex-col items-center w-full px-2">
            <div 
              className="w-full max-w-md min-h-64 relative"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
                <div key={animationState.key} className={`absolute inset-0 ${animationClass}`}>
                    <PhraseCard 
                      phrase={currentPhrase} 
                      onSpeak={speak} 
                      isFlipped={isAnswerRevealed} 
                      onFlip={() => setIsAnswerRevealed(false)}
                      onOpenChat={onOpenChat} 
                      onImproveSkill={handleImproveSkill}
                      onOpenDeepDive={onOpenDeepDive}
                      onOpenMovieExamples={onOpenMovieExamples}
                      onWordClick={onOpenWordAnalysis}
                      onOpenSentenceChain={onOpenSentenceChain}
                      onOpenImprovePhrase={onOpenImprovePhrase}
                      onOpenPhraseBuilder={onOpenPhraseBuilder}
                    />
                </div>
            </div>
            {renderButtons()}
        </div>
    );
  }

  return renderContent();
};

export default PracticePage;