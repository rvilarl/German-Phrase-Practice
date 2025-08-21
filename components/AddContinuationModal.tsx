import React, { useState, useEffect, useRef } from 'react';
import { SpeechRecognition } from '../types';
import MicrophoneIcon from './icons/MicrophoneIcon';
import SendIcon from './icons/SendIcon';
import CloseIcon from './icons/CloseIcon';

interface AddContinuationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
}

const AddContinuationModal: React.FC<AddContinuationModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'ru-RU';
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onSubmit(transcript);
        }
      };
      recognitionRef.current = recognition;
    }
  }, [onSubmit]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setInputText('');
      if (isListening) {
        recognitionRef.current?.abort();
      }
    }
  }, [isOpen]);
  
  const handleToggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSubmit(inputText.trim());
    }
  };
  
  if (!isOpen) return null;

  const hasText = inputText.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center" onClick={onClose}>
      <div
        className="bg-slate-900 rounded-lg shadow-2xl w-full max-w-sm m-4 p-4"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex items-center space-x-3">
          <div className="relative flex-grow">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isListening ? "Слушаю..." : "Добавить свой вариант..."}
              className="w-full bg-slate-700 rounded-lg p-3 pr-10 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isListening}
            />
            {hasText && !isListening && (
              <button
                type="button"
                onClick={() => setInputText('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                aria-label="Очистить поле"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            )}
          </div>
          <button
            type={hasText ? 'submit' : 'button'}
            onClick={hasText ? undefined : handleToggleListening}
            disabled={isListening}
            aria-label={hasText ? 'Отправить' : 'Голосовой ввод'}
            className={`p-3 rounded-lg transition-colors flex-shrink-0 ${
              isListening
                ? 'bg-red-600 animate-pulse'
                : hasText
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-slate-600 hover:bg-slate-500'
            } disabled:opacity-50`}
          >
            {hasText ? (
              <SendIcon className="w-6 h-6 text-white" />
            ) : (
              <MicrophoneIcon className="w-6 h-6 text-white" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddContinuationModal;
