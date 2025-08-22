import React from 'react';
import type { WordAnalysis } from '../types';
import Spinner from './Spinner';
import CloseIcon from './icons/CloseIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import AudioPlayer from './AudioPlayer';

interface WordAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  word: string;
  analysis: WordAnalysis | null;
  isLoading: boolean;
  error: string | null;
  onOpenVerbConjugation: (infinitive: string) => void;
  onOpenNounDeclension: (noun: string, article: string) => void;
}

const WordAnalysisModal: React.FC<WordAnalysisModalProps> = ({ isOpen, onClose, word, analysis, isLoading, error, onOpenVerbConjugation, onOpenNounDeclension }) => {
  if (!isOpen) return null;

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex flex-col justify-center items-center h-full"><Spinner className="h-10 w-10 text-purple-400" /><p className="mt-4 text-slate-400">Анализируем слово...</p></div>;
    }
    if (error) {
      return <div className="flex justify-center items-center h-full"><div className="text-center bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg"><p className="font-semibold">Ошибка анализа</p><p className="text-sm">{error}</p></div></div>;
    }
    if (!analysis) {
      return <div className="flex justify-center items-center h-full"><p className="text-slate-400">Нет данных для анализа.</p></div>;
    }

    return (
      <div className="space-y-6">
        {/* Main Info */}
        <div className="text-center">
            <div className="flex justify-center items-center gap-x-3">
                <h3 className="text-3xl font-bold text-slate-100">{analysis.word}</h3>
                <AudioPlayer textToSpeak={analysis.word} />
            </div>
            <p className="text-lg text-purple-300 mt-1">{analysis.partOfSpeech}</p>
        </div>
        
        <div className="bg-slate-700/50 p-4 rounded-lg">
            <p className="text-xl text-center text-slate-200">{analysis.translation}</p>
        </div>

        {/* Details */}
        {(analysis.nounDetails || analysis.verbDetails) && (
            <div className="bg-slate-700/50 p-4 rounded-lg space-y-3">
                <h4 className="font-semibold text-slate-300 border-b border-slate-600 pb-2 mb-3">Грамматическая справка</h4>
                {analysis.nounDetails && (
                    <>
                        <div className="flex justify-between items-center"><span className="text-slate-400">Артикль:</span> <strong className="text-slate-100 font-mono bg-slate-600 px-2 py-0.5 rounded">{analysis.nounDetails.article}</strong></div>
                        <div className="flex justify-between items-center"><span className="text-slate-400">Множественное число:</span> <strong className="text-slate-100">{analysis.nounDetails.plural}</strong></div>
                    </>
                )}
                {analysis.verbDetails && (
                     <>
                        <div className="flex justify-between items-center"><span className="text-slate-400">Инфинитив:</span> <strong className="text-slate-100">{analysis.verbDetails.infinitive}</strong></div>
                        <div className="flex justify-between items-center"><span className="text-slate-400">Время:</span> <strong className="text-slate-100">{analysis.verbDetails.tense}</strong></div>
                        <div className="flex justify-between items-center"><span className="text-slate-400">Лицо и число:</span> <strong className="text-slate-100">{analysis.verbDetails.person}</strong></div>
                    </>
                )}
            </div>
        )}

        {/* Example */}
        <div className="bg-slate-700/50 p-4 rounded-lg">
             <h4 className="font-semibold text-slate-300 mb-3">Пример использования</h4>
             <div className="flex items-start space-x-3">
                <AudioPlayer textToSpeak={analysis.exampleSentence} />
                <div className="flex-1">
                    <p className="text-slate-200 text-lg leading-relaxed">"{analysis.exampleSentence}"</p>
                    <p className="text-slate-400 italic mt-1">«{analysis.exampleSentenceTranslation}»</p>
                </div>
            </div>
        </div>
        
        {/* Grammar Actions */}
        <div className="pt-2">
            {analysis.verbDetails && (
                <button
                    onClick={() => onOpenVerbConjugation(analysis.verbDetails!.infinitive)}
                    className="w-full text-center px-4 py-3 rounded-lg bg-purple-600/80 hover:bg-purple-600 transition-colors font-semibold text-white shadow-md"
                >
                    Спряжение глагола
                </button>
            )}
            {analysis.nounDetails && (
                <button
                    onClick={() => onOpenNounDeclension(analysis.word, analysis.nounDetails!.article)}
                    className="w-full text-center px-4 py-3 rounded-lg bg-purple-600/80 hover:bg-purple-600 transition-colors font-semibold text-white shadow-md"
                >
                    Склонение существительного
                </button>
            )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-end" onClick={onClose}>
      <div 
        className={`bg-slate-800 w-full max-w-lg h-[90%] max-h-[90vh] rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <BookOpenIcon className="w-6 h-6 text-purple-400"/>
            <h2 className="text-lg font-bold text-slate-100">Анализ слова: {word}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700">
            <CloseIcon className="w-6 h-6 text-slate-400"/>
          </button>
        </header>
        <div className="flex-grow p-6 overflow-y-auto hide-scrollbar">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default WordAnalysisModal;