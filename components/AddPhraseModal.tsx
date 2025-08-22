import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Phrase, SpeechRecognition, SpeechRecognitionErrorEvent } from '../types';
import MicrophoneIcon from './icons/MicrophoneIcon';
import CloseIcon from './icons/CloseIcon';
import KeyboardIcon from './icons/KeyboardIcon';
import SendIcon from './icons/SendIcon';
import PhraseCardSkeleton from './PhraseCardSkeleton';

interface AddPhraseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (russianPhrase: string) => Promise<{ german: string; russian: string }>;
  onTranslateGerman: (germanPhrase: string) => Promise<{ russian: string }>;
  onPhraseCreated: (phraseData: { german: string; russian: string; }) => void;
  language: 'ru' | 'de';
  autoSubmit: boolean;
}

const AddPhraseModal: React.FC<AddPhraseModalProps> = ({ isOpen, onClose, onGenerate, onTranslateGerman, onPhraseCreated, language, autoSubmit }) => {
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

    try {
      let newPhraseData: { german: string; russian: string; };
      if (language === 'ru') {
        newPhraseData = await onGenerate(trimmedText);
      } else {
        const { russian } = await onTranslateGerman(trimmedText);
        newPhraseData = { german: trimmedText, russian };
      }
      onPhraseCreated(newPhraseData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать фразу.');
      setIsLoading(false); // Stop loading on error
    }
    // `isLoading` will be reset by the parent component closing the modal.
  }, [isLoading, onGenerate, onPhraseCreated, language, onTranslateGerman]);

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = language === 'ru' ? 'ru-RU' : 'de-DE';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false); // Always stop listening UI on error
        
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return; // Not critical errors
        }
        
        console.error('Speech recognition error:', event.error, event.message);

        if (event.error === 'network') {
          setError('Ошибка сети. Пожалуйста, проверьте соединение или введите текст вручную.');
          setMode('text');
        } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError('Доступ к микрофону запрещен. Проверьте настройки и введите текст вручную.');
          setMode('text');
        } else {
          setError('Произошла ошибка распознавания речи.');
        }
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results).map(result => result[0].transcript).join('');
        setInputText(transcript);
        
        if (autoSubmit && event.results[event.results.length - 1].isFinal) {
          if (transcript.trim()) {
            handleSubmit(transcript.trim());
          }
        }
      };
      recognitionRef.current = recognition;
    }
  }, [handleSubmit, language, autoSubmit]);

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
    <div className="fixed inset-0 bg-black/70 z-[60] flex justify-center items-center backdrop-blur-sm p-4" onClick={isLoading ? undefined : onClose}>
      <div
        className="relative w-full max-w-lg min-h-[30rem] bg-slate-800/80 rounded-lg shadow-2xl flex flex-col items-center justify-between p-6"
        onClick={e => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full w-full">
            <PhraseCardSkeleton />
            <p className="mt-6 text-slate-400 text-lg">Создаем карточку...</p>
          </div>
        ) : (
          <>
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-100">Создать новую фразу</h2>
              <p className="text-slate-400 mt-1">
                {mode === 'voice' 
                  ? `Произнесите фразу на ${language === 'ru' ? 'русском' : 'немецком'}` 
                  : `Введите фразу на ${language === 'ru' ? 'русском' : 'немецком'}`}
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
                      placeholder={language === 'ru' ? "Например, 'Сколько это стоит?'" : "Zum Beispiel, 'Wie viel kostet das?'"}
                      className="w-full bg-slate-700 text-white text-lg rounded-full placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 py-3 pl-5 pr-14 transition-colors"
                      aria-label={language === 'ru' ? "Русская фраза" : "Немецкая фраза"}
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
            
            <div className="w-full flex justify-center items-center space-x-4 mt-auto pt-4">
               <button 
                  onClick={handleToggleMode}
                  className="p-3 rounded-full bg-slate-600 hover:bg-slate-500 transition-colors"
                  aria-label={mode === 'voice' ? "Переключиться на ввод текста" : "Переключиться на голосовой ввод"}
              >
                  {mode === 'voice' ? (
                      <KeyboardIcon className="w-6 h-6 text-slate-200" />
                  ) : (
                      <MicrophoneIcon className="w-6 h-6 text-slate-200" />
                  )}
              </button>

              {mode === 'voice' && !autoSubmit && (
                  <button
                      type="button"
                      onClick={() => handleSubmit(inputText)}
                      disabled={!inputText.trim()}
                      className="p-4 bg-purple-600 rounded-full hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                      aria-label="Отправить"
                  >
                      <SendIcon className="w-6 h-6 text-white" />
                  </button>
              )}
               <button onClick={onClose} className="p-3 rounded-full bg-slate-600 hover:bg-slate-500 transition-colors" disabled={isLoading} aria-label="Закрыть">
                <CloseIcon className="w-6 h-6 text-slate-200"/>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AddPhraseModal;
