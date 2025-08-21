import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SpeechRecognition, SpeechRecognitionErrorEvent } from '../types';
import MicrophoneIcon from './icons/MicrophoneIcon';
import SendIcon from './icons/SendIcon';
import CloseIcon from './icons/CloseIcon';
import KeyboardIcon from './icons/KeyboardIcon';

interface AddContinuationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
}

const AddContinuationModal: React.FC<AddContinuationModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Setup speech recognition instance
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'ru-RU';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false); // Always stop listening state on error

        if (event.error === 'no-speech' || event.error === 'aborted') {
          return; // Common cases, not errors to display.
        }
        
        console.error('Speech recognition error:', event.error, event.message);

        // If a network or permission error occurs, switch to text mode as a graceful fallback.
        if (event.error === 'network' || event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setMode('text');
        }
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        
        setInputText(transcript); // Update for text mode feedback
        
        if (event.results[event.results.length - 1].isFinal && mode === 'voice') {
          if (transcript.trim()) {
            onSubmit(transcript.trim());
          }
        }
      };
      recognitionRef.current = recognition;
    }
  }, [onSubmit, mode]);

  // Handle mode changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'voice') {
        recognitionRef.current?.start();
        inputRef.current?.blur();
      } else { // mode === 'text'
        recognitionRef.current?.stop();
        inputRef.current?.focus();
      }
    } else {
        recognitionRef.current?.abort();
    }
  }, [isOpen, mode]);
  
  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
        setMode('voice');
        setInputText('');
    }
  }, [isOpen]);

  // General keyboard shortcuts (Escape to close)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);


  const handleSubmit = () => {
    if (inputText.trim()) {
      onSubmit(inputText.trim());
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && inputText.trim()) {
        e.preventDefault();
        handleSubmit();
    }
  };
  
  if (!isOpen) return null;
  
  const hasText = inputText.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex justify-center items-center backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm m-4 p-6 flex flex-col items-center justify-between h-80"
        onClick={e => e.stopPropagation()}
      >
        {mode === 'voice' ? (
            <div className="flex-grow flex items-center justify-center">
                 <button
                    type="button"
                    onClick={() => recognitionRef.current?.start()}
                    aria-label='Голосовой ввод'
                    className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-purple-500/50 ${
                        isListening ? 'listening-glow' : 'bg-transparent hover:bg-slate-700/50'
                    }`}
                >
                    <MicrophoneIcon className="w-12 h-12 text-white" />
                </button>
            </div>
        ) : (
            <div className="w-full flex-grow flex flex-col items-center justify-center gap-y-8">
                 <div className="relative w-full flex items-center">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      placeholder="Введите текст..."
                      className="w-full bg-slate-700 text-white text-lg rounded-full placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 p-3 pr-14 transition-colors"
                    />
                     <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!hasText}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 bg-purple-600 hover:bg-purple-700 rounded-full transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed"
                        aria-label="Отправить"
                    >
                        <SendIcon className="w-5 h-5 text-white" />
                    </button>
                </div>
            </div>
        )}

        <div className="flex-shrink-0">
             {mode === 'voice' ? (
                <button 
                    onClick={() => setMode('text')}
                    className="p-3 rounded-full hover:bg-slate-700/50 transition-colors"
                    aria-label="Переключиться на ввод текста"
                >
                    <KeyboardIcon className="w-8 h-8 text-slate-300" />
                </button>
            ) : (
                <button 
                    onClick={() => setMode('voice')}
                    className="p-3 rounded-full hover:bg-slate-700/50 transition-colors"
                    aria-label="Переключиться на голосовой ввод"
                >
                    <MicrophoneIcon className="w-8 h-8 text-slate-300" />
                </button>
            )}
        </div>

      </div>
    </div>
  );
};

export default AddContinuationModal;