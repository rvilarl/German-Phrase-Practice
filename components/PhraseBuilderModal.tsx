import React, { useState, useEffect } from 'react';
import type { Phrase, PhraseEvaluation, PhraseBuilderOptions } from '../types';
import CloseIcon from './icons/CloseIcon';
import ConstructIcon from './icons/ConstructIcon';
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
      if (evaluation) return; // Don't reset after evaluation
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
          <Spinner />
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
      <div className="flex flex-col h-full">
        {/* Constructed phrase area */}
        <div className="flex-grow flex flex-col justify-center items-center space-y-4">
          <div className="w-full flex items-center gap-x-2">
             <AudioPlayer textToSpeak={userAttempt} />
             <div className="flex-grow bg-slate-700/50 p-4 rounded-lg min-h-[80px] flex flex-wrap items-center justify-center gap-2 border-2 border-dashed border-slate-600">
                {constructedWords.length === 0 && !evaluation && (
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
                className="p-3 self-start rounded-full bg-slate-600/50 hover:bg-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Очистить"
              >
                <BackspaceIcon className="w-5 h-5 text-white" />
              </button>
          </div>


          {/* Evaluation result area */}
          {evaluation && (
            <div className={`w-full p-4 rounded-lg animate-fade-in ${evaluation.isCorrect ? 'bg-green-500/20 border-green-500' : 'bg-red-500/20 border-red-500'} border-l-4`}>
                <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                        {evaluation.isCorrect ? <CheckIcon className="w-5 h-5 text-green-400" /> : <XCircleIcon className="w-5 h-5 text-red-400" />}
                    </div>
                    <div>
                        <p className="text-slate-200">{evaluation.feedback}</p>
                        {evaluation.correctedPhrase && (
                           <div className="mt-2 flex items-center gap-x-2 text-sm bg-slate-800/50 p-2 rounded-md">
                               <AudioPlayer textToSpeak={evaluation.correctedPhrase} />
                               <p className="text-slate-300"><strong className="font-semibold text-slate-100">{evaluation.correctedPhrase}</strong></p>
                           </div>
                        )}
                    </div>
                </div>
            </div>
          )}

        </div>

        {/* Available words area */}
        <div className="flex-shrink-0 pt-4">
          <div className="w-full min-h-[100px] p-4 rounded-lg bg-slate-900/50 flex flex-wrap items-center justify-center gap-2">
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
          <div className="flex justify-center items-center mt-4">
            {evaluation ? (
                <button
                  onClick={onClose}
                  className="px-8 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors font-semibold text-white shadow-md flex items-center"
                >
                  <span>Продолжить</span>
                  <ArrowRightIcon className="w-5 h-5 ml-2" />
                </button>
            ) : (
                <button
                  onClick={handleCheck}
                  disabled={constructedWords.length === 0 || isChecking}
                  className="px-8 py-3 rounded-lg bg-green-600 hover:bg-green-700 transition-colors font-semibold text-white shadow-md disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center"
                >
                  {isChecking ? <Spinner /> : <><CheckIcon className="w-5 h-5 mr-2" /><span>Проверить</span></>}
                </button>
            )}
          </div>
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
            <ConstructIcon className="w-6 h-6 text-purple-400" />
            <div>
                <h2 className="text-lg font-bold text-slate-100">Соберите фразу</h2>
                <p className="text-sm text-slate-400">{phrase.russian}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700">
            <CloseIcon className="w-6 h-6 text-slate-400" />
          </button>
        </header>
        <div className="flex-grow p-6 overflow-y-auto hide-scrollbar">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default PhraseBuilderModal;