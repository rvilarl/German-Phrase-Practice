import React, { useCallback, useRef, useState, useEffect } from 'react';
import type { Phrase } from '../types';
import PhraseCard from '../components/PhraseCard';
import Spinner from '../components/Spinner';
import ListIcon from '../components/icons/ListIcon';
import TrashIcon from '../components/icons/TrashIcon';
import MessageQuestionIcon from '../components/icons/MessageQuestionIcon';


const SWIPE_THRESHOLD = 50; // pixels

type AnimationDirection = 'left' | 'right';
interface AnimationState {
  key: string;
  direction: AnimationDirection;
}

const ContextMenu: React.FC<{
  phrase: Phrase;
  onClose: () => void;
  onGoToList: (phrase: Phrase) => void;
  onDelete: (phraseId: string) => void;
  onDiscuss: (phrase: Phrase) => void;
}> = ({ phrase, onClose, onGoToList, onDelete, onDiscuss }) => {
  const handleGoToList = () => { onGoToList(phrase); onClose(); };
  const handleDiscuss = () => { onDiscuss(phrase); onClose(); };
  const handleDelete = () => { onDelete(phrase.id); onClose(); };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-700 rounded-lg shadow-2xl animate-fade-in text-white w-64 overflow-hidden"
      >
        <button onClick={handleGoToList} className="w-full flex items-center px-4 py-3 text-left hover:bg-slate-600 transition-colors">
          <ListIcon className="w-5 h-5 mr-3 text-slate-300" />
          <span>Перейти в список</span>
        </button>
         <button onClick={handleDiscuss} className="w-full flex items-center px-4 py-3 text-left hover:bg-slate-600 transition-colors">
          <MessageQuestionIcon className="w-5 h-5 mr-3 text-slate-300" />
          <span>Обсудить перевод</span>
        </button>
        <button onClick={handleDelete} className="w-full flex items-center px-4 py-3 text-left hover:bg-slate-600 transition-colors text-red-400">
          <TrashIcon className="w-5 h-5 mr-3" />
          <span>Удалить</span>
        </button>
      </div>
    </>
  );
};


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
  onUpdateMastery: (action: 'know' | 'forgot' | 'dont_know') => void;
  onContinue: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onOpenChat: (phrase: Phrase) => void;
  onOpenDeepDive: (phrase: Phrase) => void;
  onOpenMovieExamples: (phrase: Phrase) => void;
  onOpenWordAnalysis: (phrase: Phrase, word: string) => void;
  onOpenSentenceChain: (phrase: Phrase) => void;
  onOpenImprovePhrase: (phrase: Phrase) => void;
  onOpenPhraseBuilder: (phrase: Phrase) => void;
  onOpenLearningAssistant: (phrase: Phrase) => void;
  onOpenVoiceWorkspace: (phrase: Phrase) => void;
  onDeletePhrase: (phraseId: string) => void;
  onGoToList: (phrase: Phrase) => void;
  onOpenDiscussTranslation: (phrase: Phrase) => void;
  onGenerateHint: (phrase: Phrase) => Promise<string>;
}

const PracticePage: React.FC<PracticePageProps> = (props) => {
  const {
    currentPhrase, isAnswerRevealed, animationState, isExiting, unmasteredCount,
    fetchNewPhrases, isLoading, error, isGenerating, apiProviderAvailable,
    onUpdateMastery, onContinue, onSwipeLeft, onSwipeRight,
    onOpenChat, onOpenDeepDive, onOpenMovieExamples, onOpenWordAnalysis,
    onOpenSentenceChain, onOpenImprovePhrase, onOpenPhraseBuilder, onOpenLearningAssistant,
    onOpenVoiceWorkspace, onDeletePhrase, onGoToList, onOpenDiscussTranslation, onGenerateHint
  } = props;

  const [contextMenuPhrase, setContextMenuPhrase] = React.useState<Phrase | null>(null);
  const touchStartRef = useRef<number | null>(null);
  const touchMoveRef = useRef<number | null>(null);
  
  const [hint, setHint] = useState<string | null>(null);
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [isHintVisible, setIsHintVisible] = useState(false);

  useEffect(() => {
    if (currentPhrase) {
        setHint(null);
        setIsHintVisible(false);
        setIsHintLoading(false);
    }
  }, [currentPhrase]);

  const handleShowHint = useCallback(async () => {
    if (!currentPhrase || isHintVisible || isHintLoading || isAnswerRevealed) return;

    if (hint) {
        setIsHintVisible(true);
        return;
    }

    setIsHintLoading(true);
    try {
        const generatedHint = await onGenerateHint(currentPhrase);
        setHint(generatedHint);
        setIsHintVisible(true);
    } catch (e) {
        console.error("Failed to generate hint", e);
    } finally {
        setIsHintLoading(false);
    }
  }, [currentPhrase, hint, isHintVisible, isHintLoading, isAnswerRevealed, onGenerateHint]);

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, []);
  
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
      if (deltaX < -SWIPE_THRESHOLD) onSwipeLeft();
      else if (deltaX > SWIPE_THRESHOLD) onSwipeRight();
    }
    touchStartRef.current = null;
    touchMoveRef.current = null;
  };

  const renderButtons = () => {
     if (isAnswerRevealed) {
        return <div className="flex justify-center mt-8"><button onClick={onContinue} className="px-10 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors font-semibold text-white shadow-md" disabled={isExiting}>Продолжить</button></div>;
     }
     const hasBeenReviewed = currentPhrase?.lastReviewedAt !== null;
     return (
        <div className="flex justify-center space-x-2 sm:space-x-4 mt-8">
            {!hasBeenReviewed && <button onClick={() => onUpdateMastery('dont_know')} className="px-4 sm:px-6 py-3 rounded-lg bg-yellow-600 hover:bg-yellow-700 transition-colors font-semibold text-white shadow-md">Не знаю</button>}
            <button onClick={() => onUpdateMastery('forgot')} className="px-4 sm:px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 transition-colors font-semibold text-white shadow-md">Забыл</button>
            <button onClick={() => onUpdateMastery('know')} className="px-4 sm:px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 transition-colors font-semibold text-white shadow-md">Знаю</button>
        </div>
     );
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
                      onFlip={() => { /* Flipping is handled by mastery buttons now */ }}
                      onOpenChat={onOpenChat} 
                      onOpenDeepDive={onOpenDeepDive}
                      onOpenMovieExamples={onOpenMovieExamples}
                      onWordClick={onOpenWordAnalysis}
                      onOpenSentenceChain={onOpenSentenceChain}
                      onOpenImprovePhrase={onOpenImprovePhrase}
                      onOpenPhraseBuilder={onOpenPhraseBuilder}
                      onOpenContextMenu={setContextMenuPhrase}
                      onOpenVoicePractice={onOpenVoiceWorkspace}
                      onOpenLearningAssistant={onOpenLearningAssistant}
                      hint={hint}
                      isHintVisible={isHintVisible}
                      isHintLoading={isHintLoading}
                      onShowHint={handleShowHint}
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
      {contextMenuPhrase && (
        <ContextMenu
          phrase={contextMenuPhrase}
          onClose={() => setContextMenuPhrase(null)}
          onDelete={onDeletePhrase}
          onGoToList={onGoToList}
          onDiscuss={onOpenDiscussTranslation}
        />
      )}
    </>
  );
};

export default PracticePage;