import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Phrase, PhraseEvaluation, PhraseBuilderOptions, SpeechRecognition, SpeechRecognitionErrorEvent } from '../types';
import CloseIcon from './icons/CloseIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import Spinner from './Spinner';
import CheckIcon from './icons/CheckIcon';
import XCircleIcon from './icons/XCircleIcon';
import AudioPlayer from './AudioPlayer';
import BackspaceIcon from './icons/BackspaceIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';
import * as cacheService from '../services/cacheService';
import BookOpenIcon from './icons/BookOpenIcon';
import FeedbackMessage from './FeedbackMessage';

interface VoiceWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  phrase: Phrase | null;
  onEvaluate: (phrase: Phrase, attempt: string) => Promise<PhraseEvaluation>;
  onSuccess: (phrase: Phrase) => void;
  onFailure: (phrase: Phrase) => void;
  onNextPhrase: () => void;
  onPracticeNext: () => void;
  onGeneratePhraseBuilderOptions: (phrase: Phrase) => Promise<PhraseBuilderOptions>;
  settings: {
    automation: {
        autoCheckShortPhrases: boolean;
        learnNextPhraseHabit: boolean;
    }
  };
  buttonUsage: { close: number; continue: number; next: number };
  onLogButtonUsage: (button: 'close' | 'continue' | 'next') => void;
  habitTracker: { quickNextCount: number, quickBuilderNextCount?: number };
  onHabitTrackerChange: (updater: React.SetStateAction<{ quickNextCount: number, quickBuilderNextCount?: number }>) => void;
  showToast: (config: { message: string; type?: 'default' | 'automationSuccess' }) => void;
  onOpenLearningAssistant: (phrase: Phrase) => void;
}

interface Word {
  text: string;
  id: string; // unique identifier
}

interface AvailableWord extends Word {
  originalIndex: number;
}

type DraggedItem = {
  word: Word;
  from: 'constructed' | 'available';
  index: number;
}

const WordBankSkeleton = () => (
    <div className="flex flex-wrap justify-center gap-2 w-full animate-pulse">
      {['w-20', 'w-28', 'w-24', 'w-16', 'w-32', 'w-20', 'w-24', 'w-28', 'w-16', 'w-24'].map((width, index) => (
        <div key={index} className={`h-11 bg-slate-700 rounded-lg ${width}`}></div>
      ))}
    </div>
);

const normalizeString = (str: string) => str.toLowerCase().replace(/[.,!?]/g, '').trim();

const VoiceWorkspaceModal: React.FC<VoiceWorkspaceModalProps> = ({
  isOpen, onClose, phrase, onEvaluate, onSuccess, onFailure, onNextPhrase, onGeneratePhraseBuilderOptions, onPracticeNext,
  settings, buttonUsage, onLogButtonUsage, habitTracker, onHabitTrackerChange, showToast, onOpenLearningAssistant
}) => {
  const [allWordOptions, setAllWordOptions] = useState<AvailableWord[]>([]);
  const [constructedWords, setConstructedWords] = useState<Word[]>([]);
  const [evaluation, setEvaluation] = useState<PhraseEvaluation | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [transientFeedback, setTransientFeedback] = useState<{ message: string; key: number } | null>(null);
  const [isFeedbackFading, setIsFeedbackFading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Drag & Drop State
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [ghostPosition, setGhostPosition] = useState<{ x: number, y: number } | null>(null);
  
  // Automation State
  const [successTimestamp, setSuccessTimestamp] = useState<number | null>(null);
  const [hasUserPausedInSession, setHasUserPausedInSession] = useState(false);
  const thinkTimerRef = useRef<number | null>(null);
  const interactionRef = useRef<HTMLDivElement>(null);

  // Help State
  const [isStuck, setIsStuck] = useState(false);
  const [hintWordId, setHintWordId] = useState<string | null>(null);
  const [hintCount, setHintCount] = useState(0);
  const [showPostHintButtons, setShowPostHintButtons] = useState(false);
  const inactivityTimerRef = useRef<number | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const constructedPhraseRef = useRef<HTMLDivElement>(null);

  const constructedWordIds = useMemo(() => new Set(constructedWords.map(w => w.id)), [constructedWords]);
  const availableWords = useMemo(() => allWordOptions.filter(w => !constructedWordIds.has(w.id)), [allWordOptions, constructedWordIds]);

  const resetState = useCallback(() => {
    setConstructedWords([]);
    setAllWordOptions([]);
    setEvaluation(null);
    setIsChecking(false);
    setIsListening(false);
    setIsLoadingOptions(false);
    setDraggedItem(null);
    setDropIndex(null);
    setGhostPosition(null);
    setAttemptNumber(1);
    setTransientFeedback(null);
    setIsFeedbackFading(false);
    setOptionsError(null);
    setSpeechError(null);
    setSuccessTimestamp(null);
    setHasUserPausedInSession(false);
    if (thinkTimerRef.current) clearTimeout(thinkTimerRef.current);
    // Help state reset
    setIsStuck(false);
    setHintWordId(null);
    setHintCount(0);
    setShowPostHintButtons(false);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
  }, []);
  
  const loadWordOptions = useCallback(async () => {
      if (!phrase) return;
      setIsLoadingOptions(true);
      setOptionsError(null);
      
      const cacheKey = `phrase_builder_${phrase.id}`;
      const cachedOptions = cacheService.getCache<PhraseBuilderOptions>(cacheKey);

      if (cachedOptions) {
          setAllWordOptions(cachedOptions.words.map((w, i) => ({ text: w, id: `avail-${i}`, originalIndex: i })));
          setIsLoadingOptions(false);
          return;
      }

      try {
          const options = await onGeneratePhraseBuilderOptions(phrase);
          cacheService.setCache(cacheKey, options);
          setAllWordOptions(options.words.map((w, i) => ({ text: w, id: `avail-${i}`, originalIndex: i })));
      } catch (err) {
          let displayError = "Произошла непредвиденная ошибка.";
          console.error("Failed to load phrase builder options:", err);
          if (err instanceof Error) {
              if (err.message.includes("500") || err.message.includes("Internal Server Error")) {
                  displayError = "Сервис временно недоступен (ошибка 500).";
              } else if (err.message.includes("API key")) {
                  displayError = "Ошибка конфигурации API ключа.";
              } else {
                  displayError = "Не удалось выполнить запрос.";
              }
          }
          setOptionsError(`Не удалось загрузить варианты слов. ${displayError}`);
      } finally {
          setIsLoadingOptions(false);
      }
  }, [phrase, onGeneratePhraseBuilderOptions]);


  // Effect to handle modal opening and closing.
  useEffect(() => {
    if (isOpen && phrase) {
      resetState();
      loadWordOptions();
    }

    return () => {
        recognitionRef.current?.abort();
    };
  }, [isOpen, phrase, resetState, loadWordOptions]);

  // Effect for transient feedback visibility
  useEffect(() => {
    if (transientFeedback) {
      const timer = setTimeout(() => {
        setIsFeedbackFading(true);
        const fadeOutTimer = setTimeout(() => {
            setTransientFeedback(null);
        }, 500); // match animation duration
        return () => clearTimeout(fadeOutTimer);
      }, 3000); // 3 seconds visible
      return () => clearTimeout(timer);
    }
  }, [transientFeedback]);

  // Effect for detecting "thinking"
  useEffect(() => {
    if (isOpen && phrase && !evaluation && !hasUserPausedInSession) {
        const resetThinkTimer = () => {
            if (thinkTimerRef.current) clearTimeout(thinkTimerRef.current);
            thinkTimerRef.current = window.setTimeout(() => {
                setHasUserPausedInSession(true);
            }, 5000); // 5 seconds
        };
        
        resetThinkTimer();
        const interactionNode = interactionRef.current;
        interactionNode?.addEventListener('mousemove', resetThinkTimer);
        interactionNode?.addEventListener('touchstart', resetThinkTimer);
        
        return () => {
            if (thinkTimerRef.current) clearTimeout(thinkTimerRef.current);
            interactionNode?.removeEventListener('mousemove', resetThinkTimer);
            interactionNode?.removeEventListener('touchstart', resetThinkTimer);
        };
    }
  }, [isOpen, phrase, evaluation, constructedWords, hasUserPausedInSession]);

  // Effect for inactivity and hinting
  useEffect(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);

    if (!isOpen || !phrase || isChecking || evaluation || isListening || isLoadingOptions) {
      return;
    }

    const handleTimeout = () => {
      const constructedPhrase = constructedWords.map(w => w.text).join(' ');
      if (constructedWords.length === 0) {
        setIsStuck(true);
      } else {
        const correctPrefix = phrase.german.startsWith(constructedPhrase + ' ');
        if (correctPrefix && constructedWords.length >= 2) {
          if (hintCount < 2) {
            const nextWordIndex = constructedWords.length;
            const germanWords = phrase.german.split(' ');
            if (nextWordIndex < germanWords.length) {
              const nextCorrectWord = germanWords[nextWordIndex];
              const hintedWord = availableWords.find(aw => normalizeString(aw.text) === normalizeString(nextCorrectWord));
              if (hintedWord) {
                setHintWordId(hintedWord.id);
                setHintCount(prev => prev + 1);
                setTimeout(() => setHintWordId(null), 6000); // Reset after 3*2s animation
              }
            }
          } else { 
            setShowPostHintButtons(true);
          }
        }
      }
    };

    const delay = (constructedWords.length === 0) ? 5000 : 5000;
    inactivityTimerRef.current = window.setTimeout(handleTimeout, delay);

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [isOpen, phrase, isChecking, evaluation, isListening, isLoadingOptions, constructedWords, hintCount, availableWords]);

  const handleCheck = useCallback(async () => {
    if (!phrase) return;
    const userAttempt = constructedWords.map(w => w.text).join(' ');
    if (!userAttempt) return;
    
    setSuccessTimestamp(null);
    if (thinkTimerRef.current) clearTimeout(thinkTimerRef.current);

    const isCorrectLocally = normalizeString(userAttempt) === normalizeString(phrase.german);
    const habitLearned = (habitTracker.quickBuilderNextCount || 0) >= 5;
    const shouldAutoAdvance = isCorrectLocally && settings.automation.learnNextPhraseHabit && habitLearned && !hasUserPausedInSession;
    
    if (shouldAutoAdvance) {
        onSuccess(phrase);
        setSuccessTimestamp(Date.now());
        onPracticeNext();
        showToast({ message: 'Следующая фраза', type: 'automationSuccess' });
        return; 
    }

    if (isCorrectLocally) {
      setEvaluation({ isCorrect: true, feedback: 'Отлично! Всё верно.' });
      onSuccess(phrase);
      setSuccessTimestamp(Date.now());
      return;
    }

    if (attemptNumber === 1) {
      setAttemptNumber(2);
      setTransientFeedback({ message: 'К сожалению, ошибка. Попробуйте еще раз.', key: Date.now() });
      setIsFeedbackFading(false);
      recognitionRef.current?.stop();
    } else {
      setIsChecking(true);
      setEvaluation(null);
      try {
        const result = await onEvaluate(phrase, userAttempt);
        setEvaluation(result);
        if(result.isCorrect) {
          onSuccess(phrase);
          setSuccessTimestamp(Date.now());
        } else {
          onFailure(phrase);
        }
      } catch (err) {
        setEvaluation({ isCorrect: false, feedback: err instanceof Error ? err.message : 'Ошибка проверки.' });
        onFailure(phrase);
      } finally {
        setIsChecking(false);
      }
    }
  }, [phrase, constructedWords, onSuccess, onFailure, onEvaluate, attemptNumber, habitTracker.quickBuilderNextCount, settings.automation.learnNextPhraseHabit, hasUserPausedInSession, onPracticeNext, showToast]);

  // Effect for intelligent auto-checking
  useEffect(() => {
    if (!settings.automation.autoCheckShortPhrases) return;

    const autoCheck = () => {
      if (!isOpen || !phrase || isLoadingOptions || isChecking || evaluation || isListening) {
        return;
      }
      
      const userAttempt = constructedWords.map(w => w.text).join(' ');
      if (!userAttempt) {
        return;
      }
      
      const wordCount = phrase.german.split(' ').length;
      if (wordCount > 3) {
        return;
      }

      if (normalizeString(userAttempt) === normalizeString(phrase.german)) {
        const timer = setTimeout(() => {
          if (isOpen && !isChecking && !evaluation) {
            handleCheck();
          }
        }, 400);
        
        return () => clearTimeout(timer);
      }
    };

    const cleanup = autoCheck();
    return cleanup;
  }, [constructedWords, phrase, isOpen, isLoadingOptions, isChecking, evaluation, isListening, handleCheck, settings.automation.autoCheckShortPhrases]);
  
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'de-DE';
      recognition.continuous = false; // Changed to false for better reliability
      recognition.interimResults = true;
      
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (e: SpeechRecognitionErrorEvent) => { 
        if (e.error !== 'aborted' && e.error !== 'no-speech') {
          console.error('Speech error:', e.error);
          let userFriendlyError = 'Произошла ошибка распознавания речи.';
          if (e.error === 'network') {
              userFriendlyError = 'Ошибка сети при распознавании речи.';
          } else if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
              userFriendlyError = 'Доступ к микрофону не разрешен.';
          }
          setSpeechError(userFriendlyError);
        }
        setIsListening(false); 
      };
      
      recognition.onresult = (event) => {
        // With continuous=false, we only process the final result of an utterance.
        const result = event.results[event.results.length - 1];
        if (result.isFinal) {
            const finalTranscript = result[0].transcript;
            if (finalTranscript.trim()) {
                const newWords = finalTranscript.trim().split(' ').map((text, index) => ({ text, id: `spoken-${Date.now()}-${index}` }));
                setConstructedWords(prev => [...prev, ...newWords]);
            }
        }
      };
      recognitionRef.current = recognition;
    }
    return () => recognitionRef.current?.abort();
  }, []);
  
  const handleUserInteraction = (callback: () => void) => {
    setIsStuck(false);
    setShowPostHintButtons(false);
    setHintWordId(null);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    callback();
  };

  const handleMicClick = () => handleUserInteraction(() => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setSpeechError(null);
      recognitionRef.current?.start();
    }
  });
  
  const handleDeselectWord = (word: Word) => handleUserInteraction(() => {
    setConstructedWords(prev => prev.filter(w => w.id !== word.id));
  });

  const handleReset = () => handleUserInteraction(() => {
    setConstructedWords([]);
  });
  
  const handleSelectWord = (word: AvailableWord) => handleUserInteraction(() => {
    if (!!evaluation) return;
    setConstructedWords(prev => [...prev, word]);
  });

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, word: Word, from: 'available' | 'constructed', index: number) => {
    setDraggedItem({ word, from, index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', word.id);
    const emptyImage = new Image();
    e.dataTransfer.setDragImage(emptyImage, 0, 0);
    setGhostPosition({ x: e.clientX, y: e.clientY });
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem) return;
    if (ghostPosition) setGhostPosition({ x: e.clientX, y: e.clientY });
    const dropZone = constructedPhraseRef.current;
    if (!dropZone) return;
    // FIX: Add explicit type cast to resolve TypeScript error.
    const children = Array.from(dropZone.children).filter(child => (child as Element).hasAttribute('data-word-id'));
    let newIndex = children.length;
    for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement;
        const rect = child.getBoundingClientRect();
        if (e.clientX < rect.left + rect.width / 2) {
            newIndex = i;
            break;
        }
    }
    setDropIndex(newIndex);
  };
  
  const handleDrop = () => handleUserInteraction(() => {
    if (!draggedItem || dropIndex === null) return;
    const { word, from, index } = draggedItem;
    let newConstructed = [...constructedWords];
    if (from === 'constructed') newConstructed.splice(index, 1);
    newConstructed.splice(dropIndex, 0, word);
    setConstructedWords(newConstructed);
    setDraggedItem(null); setDropIndex(null); setGhostPosition(null);
  });
  
  const handleDragEnd = () => {
    setDraggedItem(null); setDropIndex(null); setGhostPosition(null);
  };

  const handleActionButtonClick = useCallback((key: 'close' | 'continue' | 'next', action: () => void) => {
      onLogButtonUsage(key);
      if (successTimestamp) {
          const timeSinceSuccess = Date.now() - successTimestamp;
          if (timeSinceSuccess < 2000) { // 2 seconds threshold
              onHabitTrackerChange(prev => ({ ...prev, quickBuilderNextCount: (prev.quickBuilderNextCount || 0) + 1 }));
          } else {
              onHabitTrackerChange(prev => ({ ...prev, quickBuilderNextCount: 0 }));
          }
      }
      action();
  }, [onLogButtonUsage, successTimestamp, onHabitTrackerChange]);

  const buttons = useMemo(() => {
    const buttonData = [
      {
        key: 'close' as const,
        action: () => handleActionButtonClick('close', onClose),
        icon: <CloseIcon className="w-6 h-6" />,
        className: 'bg-slate-600 hover:bg-slate-700',
        label: 'Закрыть',
      },
      {
        key: 'continue' as const,
        action: () => handleActionButtonClick('continue', onNextPhrase),
        icon: <CheckIcon className="w-6 h-6" />,
        className: 'bg-green-600 hover:bg-green-700',
        label: 'Продолжить',
      },
      {
        key: 'next' as const,
        action: () => handleActionButtonClick('next', onPracticeNext),
        icon: <ArrowRightIcon className="w-6 h-6" />,
        className: 'bg-purple-600 hover:bg-purple-700',
        label: 'Следующая фраза',
      },
    ];
    // Dynamic button layout has been removed for a consistent UI.
    return buttonData;
  }, [handleActionButtonClick, onClose, onNextPhrase, onPracticeNext]);

  const handleFailureAndReveal = useCallback(() => {
    if (!phrase) return;
    onFailure(phrase);
    setEvaluation({
      isCorrect: false,
      feedback: 'Вот правильный ответ. Попробуйте в следующий раз!',
      correctedPhrase: phrase.german,
    });
    setIsStuck(false);
    setShowPostHintButtons(false);
  }, [phrase, onFailure]);
  
  const handleLearn = useCallback(() => {
    if (!phrase) return;
    onOpenLearningAssistant(phrase);
  }, [phrase, onOpenLearningAssistant]);

  if (!isOpen || !phrase) return null;
  
  const userAttempt = constructedWords.map(w => w.text).join(' ');

  return (
    <>
      {draggedItem && ghostPosition && (
        <div className="drag-ghost" style={{ left: ghostPosition.x, top: ghostPosition.y, transform: 'translate(-50%, -50%) rotate(-5deg) scale(1.1)' }}>
          {draggedItem.word.text}
        </div>
      )}
      <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-end" onClick={onClose}>
        <div
          className={`bg-slate-800 w-full max-w-3xl h-[90%] max-h-[90vh] rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
          onClick={e => e.stopPropagation()}
        >
          <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-slate-700">
            <h2 className="text-xl font-bold text-purple-300 text-center flex-grow">{phrase.russian}</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700">
              <CloseIcon className="w-6 h-6 text-slate-400" />
            </button>
          </header>

          <div ref={interactionRef} className="flex-grow flex flex-col p-4 overflow-hidden relative">
              <div className="flex-shrink-0 flex items-center gap-x-2">
                  <AudioPlayer textToSpeak={userAttempt} />
                  <div 
                    ref={constructedPhraseRef} 
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragLeave={() => setDropIndex(null)}
                    className="flex-grow bg-slate-700/50 p-4 rounded-lg min-h-[80px] flex flex-wrap items-center justify-start gap-2 border-2 border-dashed border-slate-600"
                  >
                    {constructedWords.length === 0 && dropIndex === null && <p className="text-slate-500 w-full text-center">Произнесите фразу или перетащите слова сюда</p>}
                    
                    {constructedWords.map((word, index) => (
                      <React.Fragment key={word.id}>
                        {dropIndex === index && <span className="drop-indicator" />}
                        <button
                          data-word-id={word.id}
                          onClick={() => handleDeselectWord(word)}
                          draggable
                          onDragStart={(e) => handleDragStart(e, word, 'constructed', index)}
                          onDragEnd={handleDragEnd}
                          className="px-3 py-1.5 bg-purple-600 text-white rounded-lg transition-colors text-lg font-medium cursor-grab active:cursor-grabbing"
                        >
                          {word.text}
                        </button>
                      </React.Fragment>
                    ))}
                    {dropIndex === constructedWords.length && <span className="drop-indicator" />}
                  </div>
                  <button onClick={handleReset} disabled={isChecking || !!evaluation || constructedWords.length === 0} className="p-3 self-center rounded-full bg-slate-600/50 hover:bg-slate-600 disabled:opacity-30"><BackspaceIcon className="w-5 h-5 text-white" /></button>
              </div>

              <div className="flex-shrink-0 flex justify-center items-center min-h-[48px] my-2">
                 {transientFeedback && (
                    <div key={transientFeedback.key} className={`w-full max-w-md transition-opacity duration-500 ${isFeedbackFading ? 'opacity-0' : 'opacity-100'}`}>
                        <FeedbackMessage type="error" message={transientFeedback.message} />
                    </div>
                 )}
              </div>
              
              <div className="flex-grow -mt-14 min-h-0 flex flex-col justify-end">
                  <div className="flex-shrink-0 flex justify-center items-center gap-x-3 h-12 mb-2">
                    {(isStuck || showPostHintButtons) && (
                      <div className="flex justify-center items-center gap-x-3 animate-fade-in">
                        {isStuck &&
                          <button onClick={handleFailureAndReveal} className="px-3 py-1.5 rounded-full bg-slate-600/60 hover:bg-slate-600/80 transition-colors text-white font-medium text-sm">
                            Не знаю
                          </button>
                        }
                        <button onClick={handleFailureAndReveal} className="px-3 py-1.5 rounded-full bg-slate-600/60 hover:bg-slate-600/80 transition-colors text-white font-medium text-sm">
                          Забыл
                        </button>
                        <button onClick={handleLearn} className="px-3 py-1.5 rounded-full bg-slate-600/60 hover:bg-slate-600/80 transition-colors text-white font-medium text-sm flex items-center gap-x-1.5">
                            <BookOpenIcon className="w-4 h-4" />
                            <span>Учить</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="w-full max-h-full bg-slate-900/50 flex flex-wrap items-end content-end justify-center gap-2 p-4 rounded-lg overflow-y-auto hide-scrollbar">
                      {isLoadingOptions ? (
                        <WordBankSkeleton />
                      ) : optionsError ? (
                        <div className="text-center text-red-400 p-4">{optionsError}</div>
                      ) : (
                        allWordOptions.map((word, index) => {
                          const isUsed = constructedWordIds.has(word.id);
                          return (
                            <button 
                              key={word.id}
                              onClick={() => !isUsed && handleSelectWord(word)}
                              draggable={!isUsed}
                              onDragStart={(e) => !isUsed && handleDragStart(e, word, 'available', index)}
                              onDragEnd={handleDragEnd}
                              disabled={!!evaluation || isUsed} 
                              className={`relative overflow-hidden px-3 py-1.5 bg-slate-600 text-slate-200 rounded-lg transition-all text-lg font-medium ${
                                isUsed 
                                ? 'invisible' 
                                : `cursor-grab active:cursor-grabbing disabled:opacity-30 ${word.id === hintWordId ? 'word-hint-shine' : 'hover:bg-slate-500'}`
                              }`}
                            >
                                {word.text}
                            </button>
                          );
                        })
                      )}
                  </div>
              </div>

              <div className="flex-shrink-0 pt-4 border-t border-slate-700/50 flex items-center justify-between relative min-h-[80px]">
                  <button 
                    onClick={handleMicClick} 
                    disabled={isLoadingOptions || !!evaluation}
                    className={`p-4 rounded-full transition-colors ${isListening ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-slate-600 hover:bg-slate-500'} disabled:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <MicrophoneIcon className="w-6 h-6 text-white" />
                  </button>
                  
                  {!evaluation && (
                      <button onClick={handleCheck} disabled={constructedWords.length === 0 || isChecking} className="relative px-8 py-3 rounded-lg bg-green-600 hover:bg-green-700 transition-colors font-semibold text-white shadow-md disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center min-w-[150px] h-[48px]">
                          <span className={`flex items-center transition-opacity ${isChecking ? 'opacity-0' : 'opacity-100'}`}><CheckIcon className="w-5 h-5 mr-2" /><span>Проверить</span></span>
                          {isChecking && <div className="absolute inset-0 flex items-center justify-center"><Spinner /></div>}
                      </button>
                  )}
                  {/* Placeholder to keep mic button left-aligned */}
                  {evaluation && <div />}

                  {speechError && <p className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs text-red-400 mt-1 w-full text-center">{speechError}</p>}
              </div>
              
              <div className={`absolute bottom-0 left-0 right-0 p-6 pt-4 bg-slate-800 border-t border-slate-700/50 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-out ${evaluation ? 'translate-y-0' : 'translate-y-full'}`}>
                {evaluation && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className={`flex-grow w-full sm:w-auto p-3 rounded-lg ${evaluation.isCorrect ? 'bg-green-500/20' : 'bg-red-500/20'} flex items-start space-x-3`}>
                      <div className="flex-shrink-0 mt-0.5">{evaluation.isCorrect ? <CheckIcon className="w-5 h-5 text-green-400" /> : <XCircleIcon className="w-5 h-5 text-red-400" />}</div>
                      <div>
                        <p className="text-slate-200 text-sm">{evaluation.feedback}</p>
                        {evaluation.correctedPhrase && <div className="mt-2 flex items-center gap-x-2 text-sm bg-slate-800/50 p-1.5 rounded-md"><AudioPlayer textToSpeak={evaluation.correctedPhrase} /><p className="text-slate-300"><strong className="font-semibold text-slate-100">{evaluation.correctedPhrase}</strong></p></div>}
                      </div>
                    </div>
                    <div className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-3">
                        {buttons.map(button => (
                           <button
                                key={button.key}
                                onClick={button.action}
                                className={`flex-1 p-3.5 rounded-lg transition-colors text-white shadow-md flex justify-center ${button.className}`}
                                aria-label={button.label}
                           >
                             {button.icon}
                           </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VoiceWorkspaceModal;