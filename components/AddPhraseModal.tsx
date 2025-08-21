import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Phrase, SpeechRecognition } from '../types';
import MicrophoneIcon from './icons/MicrophoneIcon';
import CloseIcon from './icons/CloseIcon';
import Spinner from './Spinner';
import KeyboardIcon from './icons/KeyboardIcon';
import SendIcon from './icons/SendIcon';

interface AddPhraseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (russianPhrase: string) => Promise<{ german: string; russian: string }>;
  onPhraseCreated: (phrase: Phrase) => void;
}

const AddPhraseModal: React.FC<AddPhraseModalProps> = ({ isOpen, onClose, onGenerate, onPhraseCreated }) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(async (textToSubmit: string) => {
    const trimmedText = textToSubmit.trim();
    if (!trimmedText || isLoading) return;

    setIsLoading(true);
    setError(null);
    recognitionRef.current?.stop();

    try {
      const newPhraseData = await onGenerate(trimmedText);
      
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
      
      onPhraseCreated(newPhrase);
      onClose();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать фразу.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, onGenerate, onPhraseCreated, onClose]);

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'ru-RU';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.error('Speech recognition error:', event.error);
          setError('Ошибка распознавания речи.');
        }
        setIsListening(false);
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results).map(result => result[0].transcript).join('');
        setInputText(transcript);
        
        if (event.results[event.results.length - 1].isFinal) {
          if (transcript.trim()) {
            handleSubmit(transcript.trim());
          }
        }
      };
      recognitionRef.current = recognition;
    }
  }, [handleSubmit]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsLoading(false);
      setInputText('');
      setMode('voice');
    } else {
      recognitionRef.current?.abort();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'voice') {
        recognitionRef.current?.start();
      } else {
        recognitionRef.current?.stop();
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  }, [isOpen, mode]);

  const handleToggleMode = () => {
    setMode(prev => (prev === 'voice' ? 'text' : 'voice'));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(inputText);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex justify-center items-center backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-lg min-h-[24rem] bg-slate-800/80 rounded-lg shadow-2xl flex flex-col items-center justify-between p-6"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full hover:bg-slate-700">
          <CloseIcon className="w-5 h-5 text-slate-400"/>
        </button>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Spinner />
            <p className="mt-4 text-slate-400">Создаем карточку...</p>
          </div>
        ) : (
          <>
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-100">Создать новую фразу</h2>
              <p className="text-slate-400 mt-1">
                {mode === 'voice' ? 'Произнесите фразу на русском' : 'Введите фразу на русском'}
              </p>
            </div>

            <div className="flex-grow flex items-center justify-center w-full">
              {mode === 'voice' ? (
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => recognitionRef.current?.start()}
                    aria-label='Голосовой ввод'
                    className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-purple-500/50 ${isListening ? 'listening-glow' : 'bg-slate-700/50 hover:bg-slate-700'}`}
                  >
                    <MicrophoneIcon className="w-12 h-12 text-white" />
                  </button>
                  <p className="mt-6 text-slate-200 text-lg h-8">{inputText || (isListening ? 'Слушаю...' : ' ')}</p>
                </div>
              ) : (
                <div className="relative w-full max-w-md">
                   <input
                      ref={inputRef}
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      placeholder="Например, 'Сколько это стоит?'"
                      className="w-full bg-slate-700 text-white text-lg rounded-full placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 py-3 pl-5 pr-14 transition-colors"
                      aria-label="Русская фраза"
                    />
                    <button
                        type="button"
                        onClick={() => handleSubmit(inputText)}
                        disabled={!inputText.trim()}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2.5 bg-purple-600 hover:bg-purple-700 rounded-full transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed"
                        aria-label="Создать"
                    >
                        <SendIcon className="w-5 h-5 text-white" />
                    </button>
                </div>
              )}
            </div>
            
            {error && !isLoading && (
              <div className="text-center bg-red-900/50 text-red-300 p-3 rounded-md text-sm w-full">
                  <strong>Ошибка:</strong> {error}
              </div>
            )}

            <div className="flex-shrink-0 mt-4">
              <button 
                  onClick={handleToggleMode}
                  className="p-3 rounded-full hover:bg-slate-700/50 transition-colors"
                  aria-label={mode === 'voice' ? "Переключиться на ввод текста" : "Переключиться на голосовой ввод"}
              >
                  {mode === 'voice' ? (
                      <KeyboardIcon className="w-7 h-7 text-slate-300" />
                  ) : (
                      <MicrophoneIcon className="w-7 h-7 text-slate-300" />
                  )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AddPhraseModal;
