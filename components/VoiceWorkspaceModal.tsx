import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Phrase, PhraseEvaluation, PhraseBuilderOptions, SpeechRecognition, SpeechRecognitionErrorEvent } from '../types';
import CloseIcon from './icons/CloseIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import Spinner from './Spinner';
import CheckIcon from './icons/CheckIcon';
import XCircleIcon from './icons/XCircleIcon';
import AudioPlayer from './AudioPlayer';
import BackspaceIcon from './icons/BackspaceIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';

interface VoiceWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  phrase: Phrase | null;
  onEvaluate: (phrase: Phrase, attempt: string) => Promise<PhraseEvaluation>;
  onSuccess: (phrase: Phrase) => void;
  onFailure: (phrase: Phrase) => void;
  onNextPhrase: () => void;
  onGeneratePhraseBuilderOptions: (phrase: Phrase) => Promise<PhraseBuilderOptions>;
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

const VoiceWorkspaceModal: React.FC<VoiceWorkspaceModalProps> = ({
  isOpen, onClose, phrase, onEvaluate, onSuccess, onFailure, onNextPhrase, onGeneratePhraseBuilderOptions
}) => {
  const [constructedWords, setConstructedWords] = useState<Word[]>([]);
  const [availableWords, setAvailableWords] = useState<AvailableWord[]>([]);
  const [evaluation, setEvaluation] = useState<PhraseEvaluation | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  // Drag & Drop State
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [ghostPosition, setGhostPosition] = useState<{ x: number, y: number } | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const constructedPhraseRef = useRef<HTMLDivElement>(null);

  const resetState = useCallback(() => {
    setConstructedWords([]);
    setAvailableWords([]);
    setEvaluation(null);
    setIsChecking(false);
    setIsListening(false);
    setIsLoadingOptions(true);
    setDraggedItem(null);
    setDropIndex(null);
    setGhostPosition(null);
  }, []);

  useEffect(() => {
    if (isOpen && phrase) {
      resetState();
      onGeneratePhraseBuilderOptions(phrase)
        .then(options => {
          setAvailableWords(options.words.map((w, i) => ({ text: w, id: `avail-${i}`, originalIndex: i })));
        })
        .finally(() => setIsLoadingOptions(false));
    }
  }, [isOpen, phrase, onGeneratePhraseBuilderOptions, resetState]);
  
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'de-DE';
      recognition.continuous = false; // Stops automatically after a pause
      recognition.interimResults = true;
      
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (e: SpeechRecognitionErrorEvent) => { if (e.error !== 'aborted') console.error('Speech error:', e.error); setIsListening(false); };
      
      recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1];
        if (result.isFinal) {
            const finalTranscript = result[0].transcript.trim();
            if (finalTranscript) {
                const newWords = finalTranscript.split(' ').map((text, index) => ({ text, id: `spoken-${Date.now()}-${index}` }));
                setConstructedWords(newWords);
            }
        }
      };
      recognitionRef.current = recognition;
    }
    return () => recognitionRef.current?.abort();
  }, []);

  const handleMicClick = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setConstructedWords([]);
      recognitionRef.current?.start();
    }
  };

  const handleCheck = async () => {
    if (!phrase) return;
    const userAttempt = constructedWords.map(w => w.text).join(' ');
    if (!userAttempt) return;
    setIsChecking(true);
    setEvaluation(null);
    try {
      const result = await onEvaluate(phrase, userAttempt);
      setEvaluation(result);
      if (result.isCorrect) onSuccess(phrase);
      else onFailure(phrase);
    } catch (err) {
      setEvaluation({ isCorrect: false, feedback: err instanceof Error ? err.message : 'Ошибка проверки.' });
      onFailure(phrase);
    } finally {
      setIsChecking(false);
    }
  };
  
  const handleDeselectWord = (word: Word) => {
    setConstructedWords(prev => prev.filter(w => w.id !== word.id));
    const newAvailableWord: AvailableWord = { ...word, originalIndex: availableWords.length + constructedWords.findIndex(w => w.id === word.id) };
    setAvailableWords(prev => [...prev, newAvailableWord].sort((a,b) => a.originalIndex - b.originalIndex));
  };

  const handleReset = () => {
    setAvailableWords([...availableWords, ...constructedWords.map((w,i)=> ({...w, originalIndex: 1000+i}))].sort((a,b) => a.originalIndex - b.originalIndex));
    setConstructedWords([]);
  };
  
  const handleSelectWord = (word: AvailableWord) => {
    if (!!evaluation) return; // Don't allow changes after evaluation
    setConstructedWords(prev => [...prev, word]);
    setAvailableWords(prev => prev.filter(w => w.id !== word.id));
  };

  // --- Drag & Drop Handlers ---
  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, word: Word, from: 'available' | 'constructed', index: number) => {
    setDraggedItem({ word, from, index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', word.id);
    
    // Custom drag ghost
    const emptyImage = new Image();
    e.dataTransfer.setDragImage(emptyImage, 0, 0);
    setGhostPosition({ x: e.clientX, y: e.clientY });
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem) return;

    if (ghostPosition) {
      setGhostPosition({ x: e.clientX, y: e.clientY });
    }

    const dropZone = constructedPhraseRef.current;
    if (!dropZone) return;

    const children = Array.from(dropZone.children).filter(child => child.hasAttribute('data-word-id'));
    let newIndex = children.length;

    for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement;
        const rect = child.getBoundingClientRect();
        const midpoint = rect.left + rect.width / 2;
        if (e.clientX < midpoint) {
            newIndex = i;
            break;
        }
    }
    
    setDropIndex(newIndex);
  };
  
  const handleDrop = () => {
    if (!draggedItem || dropIndex === null) return;

    const { word, from, index } = draggedItem;
    
    let newConstructed = [...constructedWords];
    if (from === 'constructed') {
        newConstructed.splice(index, 1);
    }

    newConstructed.splice(dropIndex, 0, word);
    setConstructedWords(newConstructed);
    
    if (from === 'available') {
        setAvailableWords(prev => prev.filter(w => w.id !== word.id));
    }

    setDraggedItem(null);
    setDropIndex(null);
    setGhostPosition(null);
  };
  
  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropIndex(null);
    setGhostPosition(null);
  };

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
          className={`bg-slate-800 w-full max-w-3xl h-[95%] max-h-[95vh] rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
          onClick={e => e.stopPropagation()}
        >
          <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-slate-700">
            <h2 className="text-xl font-bold text-purple-300 text-center flex-grow">{phrase.russian}</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700">
              <CloseIcon className="w-6 h-6 text-slate-400" />
            </button>
          </header>

          <div className="flex-grow flex flex-col p-4 overflow-hidden">
              {/* Constructed phrase area */}
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
              
              {/* Word bank */}
              <div className="flex-grow my-4 min-h-0">
                  <div className="w-full h-full bg-slate-900/50 flex flex-wrap items-start content-start justify-center gap-2 p-4 rounded-lg overflow-y-auto hide-scrollbar">
                      {isLoadingOptions ? <Spinner /> : availableWords.map((word, index) => (
                          <button 
                            key={word.id}
                            onClick={() => handleSelectWord(word)}
                            draggable
                            onDragStart={(e) => handleDragStart(e, word, 'available', index)}
                            onDragEnd={handleDragEnd}
                            disabled={!!evaluation} 
                            className="px-3 py-1.5 bg-slate-600 text-slate-200 rounded-lg transition-all text-lg font-medium disabled:opacity-30 cursor-grab active:cursor-grabbing"
                          >
                              {word.text}
                          </button>
                      ))}
                  </div>
              </div>

              {/* Footer with mic and check */}
              <div className="flex-shrink-0 pt-4 border-t border-slate-700/50 flex justify-between items-center">
                  <button onClick={handleMicClick} className={`p-4 rounded-full transition-colors ${isListening ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-slate-600 hover:bg-slate-500'}`}><MicrophoneIcon className="w-6 h-6 text-white" /></button>
                  
                  {!evaluation ? (
                      <button onClick={handleCheck} disabled={constructedWords.length === 0 || isChecking} className="relative px-8 py-3 rounded-lg bg-green-600 hover:bg-green-700 transition-colors font-semibold text-white shadow-md disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center min-w-[150px] h-[48px]">
                          <span className={`flex items-center transition-opacity ${isChecking ? 'opacity-0' : 'opacity-100'}`}><CheckIcon className="w-5 h-5 mr-2" /><span>Проверить</span></span>
                          {isChecking && <div className="absolute inset-0 flex items-center justify-center"><Spinner /></div>}
                      </button>
                  ) : (
                      <div className={`flex-grow mx-4 p-3 rounded-lg ${evaluation.isCorrect ? 'bg-green-500/20' : 'bg-red-500/20'} flex items-start space-x-3`}>
                          <div className="flex-shrink-0 mt-0.5">{evaluation.isCorrect ? <CheckIcon className="w-5 h-5 text-green-400" /> : <XCircleIcon className="w-5 h-5 text-red-400" />}</div>
                          <div>
                              <p className="text-slate-200 text-sm">{evaluation.feedback}</p>
                              {evaluation.correctedPhrase && <div className="mt-2 flex items-center gap-x-2 text-sm bg-slate-800/50 p-1.5 rounded-md"><AudioPlayer textToSpeak={evaluation.correctedPhrase} /><p className="text-slate-300"><strong>{evaluation.correctedPhrase}</strong></p></div>}
                          </div>
                      </div>
                  )}

                  <button onClick={onNextPhrase} disabled={!evaluation} className="p-4 rounded-full bg-purple-600 hover:bg-purple-700 transition-colors font-semibold text-white shadow-md disabled:bg-slate-600 disabled:cursor-not-allowed"><ArrowRightIcon className="w-6 h-6" /></button>
              </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VoiceWorkspaceModal;