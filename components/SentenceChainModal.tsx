import React, { useState, useEffect, useCallback } from 'react';
import type { Phrase, SentenceContinuation } from '../types';
import Spinner from './Spinner';
import CloseIcon from './icons/CloseIcon';
import LinkIcon from './icons/LinkIcon';
import AudioPlayer from './AudioPlayer';
import ArrowLeftIcon from './icons/ArrowLeftIcon';

interface SentenceChainModalProps {
  isOpen: boolean;
  onClose: () => void;
  phrase: Phrase;
  onGenerateContinuations: (russianPhrase: string) => Promise<SentenceContinuation>;
}

const SentenceChainModal: React.FC<SentenceChainModalProps> = ({ isOpen, onClose, phrase, onGenerateContinuations }) => {
  const [history, setHistory] = useState<string[]>([]);
  const [currentGerman, setCurrentGerman] = useState('');
  const [continuations, setContinuations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const getFullRussianPhrase = useCallback((currentHistory: string[]): string => {
    // Joins the base phrase with history parts, handling punctuation gracefully.
    let fullPhrase = phrase.russian;
    for (const part of currentHistory) {
      if (part.match(/^[.,:;!?]/)) { // if part starts with punctuation
        fullPhrase += part;
      } else {
        fullPhrase += ' ' + part;
      }
    }
    return fullPhrase;
  }, [phrase.russian]);

  const fetchContinuations = useCallback(async (russianPhrase: string) => {
    setIsLoading(true);
    setError(null);
    setContinuations([]);
    try {
      const result = await onGenerateContinuations(russianPhrase);
      setCurrentGerman(result.german);
      setContinuations(result.continuations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [onGenerateContinuations]);

  useEffect(() => {
    if (isOpen) {
      setHistory([]);
      setCurrentGerman(phrase.german);
      fetchContinuations(phrase.russian);
    }
  }, [isOpen, phrase, fetchContinuations]);
  
  const handleSelectContinuation = (continuation: string) => {
    const newHistory = [...history, continuation];
    setHistory(newHistory);
    const newRussianPhrase = getFullRussianPhrase(newHistory);
    setCurrentGerman('...'); // Placeholder
    fetchContinuations(newRussianPhrase);
  };
  
  const handleBlockClick = (index: number) => {
    const newHistory = history.slice(0, index);
    setHistory(newHistory);
    const newRussianPhrase = getFullRussianPhrase(newHistory);
    setCurrentGerman('...');
    fetchContinuations(newRussianPhrase);
  };
  
  const handleGoBackOneStep = () => {
    handleBlockClick(history.length - 1);
  };

  const renderPhraseBlocks = () => {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2 leading-relaxed">
        <span className="bg-slate-600/50 px-3 py-1.5 rounded-lg text-slate-200 text-lg">
          {phrase.russian}
        </span>
        {history.map((part, index) => (
          <button
            key={index}
            onClick={() => handleBlockClick(index)}
            className="bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-lg text-white text-lg transition-colors group relative"
            title="Нажмите, чтобы вернуться к этому шагу"
          >
            {part}
            <span className="absolute -top-1 -right-1.5 h-4 w-4 rounded-full bg-purple-800/80 group-hover:bg-red-500 flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
              ×
            </span>
          </button>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    return (
      <div className="p-4 sm:p-6 flex flex-col h-full">
        {/* Phrase Display Area */}
        <div className="bg-slate-700/50 p-4 rounded-lg mb-6 text-center">
          <div className="mb-4">
            {renderPhraseBlocks()}
          </div>
          <div className="flex items-center justify-center gap-x-3 border-t border-slate-600/50 pt-4">
            <AudioPlayer textToSpeak={currentGerman} />
            <p className="text-2xl font-bold text-purple-300 text-left">
              {currentGerman}
            </p>
          </div>
        </div>

        {/* Continuations Area */}
        <div className="flex-grow flex flex-col justify-center items-center">
          {isLoading && <Spinner />}
          {error && <div className="text-center bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg"><p className="font-semibold">Ошибка</p><p className="text-sm">{error}</p></div>}
          {!isLoading && !error && (
            continuations.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-3">
                {continuations.map((cont, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectContinuation(cont)}
                    className="px-4 py-2 bg-slate-600/70 hover:bg-slate-600 rounded-lg transition-colors text-slate-200 font-medium"
                  >
                    {cont}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400">Нет предложений для продолжения. Попробуйте вернуться назад.</p>
            )
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
            <button
                onClick={handleGoBackOneStep}
                disabled={history.length === 0 || isLoading}
                className="p-2 rounded-full hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Вернуться на шаг назад"
            >
                <ArrowLeftIcon className="w-6 h-6 text-slate-400" />
            </button>
            <div className="flex items-center space-x-2">
                 <LinkIcon className="w-6 h-6 text-purple-400"/>
                <h2 className="text-lg font-bold text-slate-100">Конструктор фраз</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700">
            <CloseIcon className="w-6 h-6 text-slate-400"/>
          </button>
        </header>
        {renderContent()}
      </div>
    </div>
  );
};

export default SentenceChainModal;
