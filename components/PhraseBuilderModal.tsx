import React, { useState, useEffect } from 'react';
import type { Phrase, PhraseEvaluation, PhraseBuilderOptions } from '../types';
import CloseIcon from './icons/CloseIcon';
import BlocksIcon from './icons/BlocksIcon';
import Spinner from './Spinner';
import CheckIcon from './icons/CheckIcon';
import XCircleIcon from './icons/XCircleIcon';
import AudioPlayer from './AudioPlayer';
import BackspaceIcon from './icons/BackspaceIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';

interface PhraseBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  phrase: Phrase | null;
  options: PhraseBuilderOptions | null;
  isLoading: boolean;
  error: string | null;
  onEvaluate: (phrase: Phrase, attempt: string) => Promise<PhraseEvaluation>;
  onSuccess: (phrase: Phrase) => void;
  onFailure: (phrase: Phrase) => void;
}

interface WordOption {
  word: string;
  id: number;
}

const PhraseBuilderModal: React.FC<PhraseBuilderModalProps> = ({
  isOpen,
  onClose,
  phrase,
  options,
  isLoading,
  error,
  onEvaluate,
  onSuccess,
  onFailure
}) => {
  const [constructedWords, setConstructedWords] = useState<WordOption[]>([]);
  const [availableWords, setAvailableWords] = useState<WordOption[]>([]);
  const [evaluation, setEvaluation] = useState<PhraseEvaluation | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (isOpen && options) {
      setAvailableWords(options.words.map((word, index) => ({ word, id: index })));
      setConstructedWords([]);
      setEvaluation(null);
      setIsChecking(false);
    }
  }, [isOpen, options]);

  if (!isOpen || !phrase) return null;

  const handleSelectWord = (word: WordOption) => {
    setConstructedWords([...constructedWords, word]);
    setAvailableWords(availableWords.filter(w => w.id !== word.id));
  };

  const handleDeselectWord = (word: WordOption) => {
    setAvailableWords([...availableWords, word].sort((a, b) => a.id - b.id));
    setConstructedWords(constructedWords.filter(w => w.id !== word.id));
  };
  
  const handleReset = () => {
      if (evaluation || isChecking) return;
      setAvailableWords([...availableWords, ...constructedWords].sort((a,b) => a.id - b.id));
      setConstructedWords([]);
  }

  const handleCheck = async () => {
    const userAttempt = constructedWords.map(w => w.word).join(' ');
    if (!userAttempt) return;

    setIsChecking(true);
    setEvaluation(null);
    try {
      const result = await onEvaluate(phrase, userAttempt);
      setEvaluation(result);
      if (result.isCorrect) {
        onSuccess(phrase);
      } else {
        onFailure(phrase);
      }
    } catch (err) {
      setEvaluation({
        isCorrect: false,
        feedback: err instanceof Error ? err.message : 'Произошла ошибка при проверке.',
      });
      onFailure(phrase);
    } finally {
      setIsChecking(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col justify-center items-center h-full">
          <Spinner className="h-10 w-10 text-purple-400" />
          <p className="mt-4 text-slate-400">Подбираем слова...</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex justify-center items-center h-full">
          <div className="text-center bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg">
            <p className="font-semibold">Ошибка</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      );
    }
    
    const userAttempt = constructedWords.map(w => w.word).join(' ');

    return (
      <div className="flex flex-col h-full relative">
        {/* Top: Constructed phrase area */}
        <div className="flex-shrink-0">
          <div className="w-full flex items-center gap-x-2">
            <AudioPlayer textToSpeak={userAttempt} />
            <div className="flex-grow bg-slate-700/50 p-4 rounded-lg min-h-[80px] flex flex-wrap items-center justify-center gap-2 border-2 border-dashed border-slate-600">
              {constructedWords.length === 0 && (
                <p className="text-slate-500">Нажмите на слова ниже, чтобы собрать фразу</p>
              )}
              {constructedWords.map(word => (
                <button
                  key={word.id}
                  onClick={() => handleDeselectWord(word)}
                  disabled={!!evaluation}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {word.word}
                </button>
              ))}
            </div>
            <button
              onClick={handleReset}
              disabled={isChecking || !!evaluation || constructedWords.length === 0}
              className="p-3 self-center rounded-full bg-slate-600/50 hover:bg-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Очистить"
            >
              <BackspaceIcon className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
        
        {/* Middle: Available words area */}
        <div className="flex-grow my-4 flex flex-col justify-end min-h-0">
           <div className="w-full bg-slate-900/50 flex flex-wrap items-start content-start justify-center gap-2 p-4 rounded-lg overflow-y-auto hide-scrollbar">
             {availableWords.map(word => (
                <button
                  key={word.id}
                  onClick={() => handleSelectWord(word)}
                  disabled={!!evaluation}
                  className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-lg transition-all text-lg font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {word.word}
                </button>
              ))}
           </div>
        </div>
        
        {/* Bottom: Action Area - a placeholder for the check button */}
        <div className="flex-shrink-0 pt-4 border-t border-slate-700/50 min-h-[80px] flex justify-center items-center">
            {!evaluation && (
                <button
                  onClick={handleCheck}
                  disabled={constructedWords.length === 0 || isChecking}
                  className="relative px-8 py-3 rounded-lg bg-green-600 hover:bg-green-700 transition-colors font-semibold text-white shadow-md disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center min-w-[150px] h-[48px]"
                >
                  <span className={`flex items-center transition-opacity ${isChecking ? 'opacity-0' : 'opacity-100'}`}>
                    <CheckIcon className="w-5 h-5 mr-2" />
                    <span>Проверить</span>
                  </span>
                  {isChecking && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Spinner />
                    </div>
                  )}
                </button>
            )}
        </div>
        
        {/* Absolutely Positioned Feedback Panel */}
        <div className={`absolute bottom-[-24px] left-[-24px] right-[-24px] p-6 pt-4 bg-slate-800 border-t border-slate-700/50 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-out ${evaluation ? 'translate-y-0' : 'translate-y-full'}`}>
          {evaluation && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Feedback Message */}
              <div className={`flex-grow w-full sm:w-auto p-3 rounded-lg ${evaluation.isCorrect ? 'bg-green-500/20' : 'bg-red-500/20'} flex items-start space-x-3`}>
                <div className="flex-shrink-0 mt-0.5">
                  {evaluation.isCorrect ? <CheckIcon className="w-5 h-5 text-green-400" /> : <XCircleIcon className="w-5 h-5 text-red-400" />}
                </div>
                <div>
                  <p className="text-slate-200 text-sm">{evaluation.feedback}</p>
                  {evaluation.correctedPhrase && (
                    <div className="mt-2 flex items-center gap-x-2 text-sm bg-slate-800/50 p-1.5 rounded-md">
                      <AudioPlayer textToSpeak={evaluation.correctedPhrase} />
                      <p className="text-slate-300"><strong className="font-semibold text-slate-100">{evaluation.correctedPhrase}</strong></p>
                    </div>
                  )}
                </div>
              </div>
              {/* Continue Button */}
              <button
                onClick={onClose}
                className="w-full sm:w-auto flex-shrink-0 px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors font-semibold text-white shadow-md flex items-center justify-center"
              >
                <span>Продолжить</span>
                <ArrowRightIcon className="w-5 h-5 ml-2" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-end" onClick={onClose}>
      <div
        className={`bg-slate-800 w-full max-w-2xl h-[90%] max-h-[90vh] rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <BlocksIcon className="w-6 h-6 text-purple-400" />
            <div>
                <h2 className="text-xl font-bold text-slate-100">{phrase.russian}</h2>
                <p className="text-sm text-slate-400">Соберите фразу</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700">
            <CloseIcon className="w-6 h-6 text-slate-400" />
          </button>
        </header>
        <div className="flex-grow p-6 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default PhraseBuilderModal;