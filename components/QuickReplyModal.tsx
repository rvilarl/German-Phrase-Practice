import React, { useState, useEffect } from 'react';
import type { Phrase } from '../types';
import CheckIcon from './icons/CheckIcon';
import XCircleIcon from './icons/XCircleIcon';

interface QuickReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  phrase: Phrase;
  options: string[];
  correctAnswer: string;
  onCorrect: () => void;
  onIncorrect: () => void;
  isLoading: boolean;
  error: string | null;
}

const QuickReplyModal: React.FC<QuickReplyModalProps> = ({ isOpen, onClose, phrase, options, correctAnswer, onCorrect, onIncorrect, isLoading, error }) => {
  const [selection, setSelection] = useState<{ value: string; isCorrect: boolean } | null>(null);
  
  useEffect(() => {
    if (!isOpen) {
      // Delay reset to allow for exit animation
      setTimeout(() => {
        setSelection(null);
      }, 300);
    }
  }, [isOpen]);
  
  const handleSelect = (option: string) => {
    if (selection) return; // Prevent multiple clicks
    
    const isCorrect = option.trim() === correctAnswer.replace(/[?]/g, '').trim();
    setSelection({ value: option, isCorrect });
    
    setTimeout(() => {
      if (isCorrect) {
        onCorrect();
      } else {
        onIncorrect();
      }
      // Don't call onClose() here, the parent component will handle it by setting the phrase to null.
    }, 800); // Delay to show feedback
  };
  
  if (!isOpen) return null;
  
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col space-y-3 animate-pulse">
          <div className="w-full h-12 bg-slate-700 rounded-lg"></div>
          <div className="w-full h-12 bg-slate-700 rounded-lg"></div>
          <div className="w-full h-12 bg-slate-700 rounded-lg"></div>
          <div className="w-full h-12 bg-slate-700 rounded-lg"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center text-center">
          <p className="text-red-400 font-semibold">Ошибка</p>
          <p className="text-sm text-slate-300 mt-2">{error}</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-slate-600 rounded-md text-white text-sm">
            Закрыть
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col space-y-3">
        {options.map((option) => {
          const isSelected = selection?.value === option;
          const isSelectedCorrect = isSelected && selection?.isCorrect;
          const isSelectedIncorrect = isSelected && !selection?.isCorrect;
          
          return (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              disabled={!!selection}
              className={`w-full text-center px-4 py-3 rounded-lg text-xl font-bold transition-all duration-300 transform
                ${isSelectedCorrect ? 'bg-green-500 text-white scale-105 shadow-lg' : ''}
                ${isSelectedIncorrect ? 'bg-red-500 text-white scale-105 shadow-lg' : ''}
                ${!isSelected ? 'bg-slate-700 text-slate-100 hover:bg-slate-600 hover:scale-105 disabled:opacity-50' : ''}
              `}
            >
              <span className="flex items-center justify-center">
                {option}
                {isSelectedCorrect && <CheckIcon className="w-6 h-6 ml-2 animate-ping" />}
                {isSelectedIncorrect && <XCircleIcon className="w-6 h-6 ml-2" />}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800/90 border border-slate-700 rounded-xl shadow-2xl p-6 w-72 animate-fade-in-center"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-center text-lg font-semibold text-slate-200 mb-4">{phrase.russian}</h2>
        {renderContent()}
      </div>
    </>
  );
};

export default QuickReplyModal;