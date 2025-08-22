import React from 'react';
import type { Phrase, DeepDiveAnalysis } from '../types';
import CloseIcon from './icons/CloseIcon';
import AnalysisIcon from './icons/AnalysisIcon';
import Spinner from './Spinner';

interface DeepDiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  phrase: Phrase;
  analysis: DeepDiveAnalysis | null;
  isLoading: boolean;
  error: string | null;
}

const chunkColorMap: { [key: string]: string } = {
  'Noun': 'bg-blue-500/20 text-blue-300 ring-blue-500/30',
  'Verb': 'bg-green-500/20 text-green-300 ring-green-500/30',
  'Adjective': 'bg-yellow-500/20 text-yellow-300 ring-yellow-500/30',
  'Adverb': 'bg-orange-500/20 text-orange-300 ring-orange-500/30',
  'Pronoun': 'bg-teal-500/20 text-teal-300 ring-teal-500/30',
  'Preposition': 'bg-purple-500/20 text-purple-300 ring-purple-500/30',
  'Article': 'bg-pink-500/20 text-pink-300 ring-pink-500/30',
  'Conjunction': 'bg-indigo-500/20 text-indigo-300 ring-indigo-500/30',
  'Particle': 'bg-gray-500/20 text-gray-300 ring-gray-500/30',
  'Default': 'bg-slate-600/50 text-slate-200 ring-slate-500/30',
};

const DeepDiveSkeleton: React.FC = () => (
  <div className="space-y-8 animate-pulse">
    {/* Stage 1 Skeleton */}
    <section>
      <div className="h-6 w-2/3 bg-slate-700 rounded mb-4"></div>
      <div className="bg-slate-700/50 p-4 rounded-lg space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="h-6 w-16 bg-slate-600 rounded"></div>
          <div className="h-6 w-24 bg-slate-600 rounded"></div>
          <div className="h-6 w-20 bg-slate-600 rounded"></div>
        </div>
        <div className="border-t border-slate-600/50 pt-4 space-y-3">
          <div className="h-4 w-full bg-slate-600 rounded"></div>
          <div className="h-4 w-5/6 bg-slate-600 rounded"></div>
          <div className="h-4 w-full bg-slate-600 rounded"></div>
        </div>
      </div>
    </section>
    {/* Stage 2 Skeleton */}
    <section>
      <div className="h-6 w-1/2 bg-slate-700 rounded mb-4"></div>
      <div className="bg-slate-700/50 p-4 rounded-lg">
        <div className="h-4 w-11/12 bg-slate-600 rounded"></div>
      </div>
    </section>
    {/* Stage 3 Skeleton */}
    <section>
      <div className="h-6 w-1/2 bg-slate-700 rounded mb-4"></div>
      <div className="bg-slate-700/50 p-4 rounded-lg">
        <div className="space-y-2 mb-4">
          <div className="h-4 w-full bg-slate-600 rounded"></div>
          <div className="h-4 w-4/5 bg-slate-600 rounded"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-slate-600 rounded-full"></div>
          <div className="h-5 w-20 bg-slate-600 rounded-full"></div>
        </div>
      </div>
    </section>
  </div>
);


const DeepDiveModal: React.FC<DeepDiveModalProps> = ({ isOpen, onClose, phrase, analysis, isLoading, error }) => {
  if (!isOpen) return null;

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex flex-col justify-center items-center h-full"><Spinner className="h-10 w-10 text-purple-400" /><p className="mt-4 text-slate-400">Анализируем фразу...</p></div>;
    }
    if (error) {
      return <div className="flex justify-center items-center h-full"><div className="text-center bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg"><p className="font-semibold">Ошибка анализа</p><p className="text-sm">{error}</p></div></div>;
    }
    if (!analysis) {
      return <div className="flex justify-center items-center h-full"><p className="text-slate-400">Нет данных для анализа.</p></div>;
    }

    return (
      <div className="space-y-8">
        {/* Stage 1: Deconstruction */}
        <section>
          <h3 className="text-xl font-bold text-purple-300 mb-4">Этап 1: Деконструкция</h3>
          <div className="bg-slate-700/50 p-4 rounded-lg">
            <p className="text-lg font-semibold text-slate-100 mb-4 leading-relaxed flex flex-wrap items-center gap-x-1 gap-y-2">
              {analysis.chunks.map((chunk, index) => (
                <span key={index} className={`px-2 py-1 rounded-md ring-1 ring-inset ${chunkColorMap[chunk.type] || chunkColorMap.Default}`}>
                  {chunk.text}
                </span>
              ))}
            </p>
            <div className="space-y-3 border-t border-slate-600/50 pt-4">
              {analysis.chunks.map((chunk, index) => (
                <div key={index} className="flex items-start text-sm">
                  <span className={`w-2 h-2 rounded-full mt-1.5 mr-3 flex-shrink-0 ${chunkColorMap[chunk.type]?.replace('text-', 'bg-').split(' ')[0] || chunkColorMap.Default.replace('text-', 'bg-').split(' ')[0]}`}></span>
                  <div>
                    <strong className="text-slate-200">{chunk.text}</strong> <span className="text-slate-400">({chunk.type})</span>: {chunk.explanation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stage 2: Personalization */}
        <section>
          <h3 className="text-xl font-bold text-green-300 mb-4">Этап 2: Персонализация</h3>
          <div className="bg-slate-700/50 p-4 rounded-lg italic">
            <p className="text-slate-200">"{analysis.personalizationQuestion}"</p>
          </div>
        </section>

        {/* Stage 3: Encoding */}
        <section>
          <h3 className="text-xl font-bold text-yellow-300 mb-4">Этап 3: Кодирование</h3>
          <div className="bg-slate-700/50 p-4 rounded-lg border-l-4 border-yellow-400">
            <p className="text-slate-200 mb-4">{analysis.mnemonicImage.description}</p>
            <div className="flex flex-wrap gap-2">
              {analysis.mnemonicImage.keywords.map((keyword, index) => (
                <span key={index} className="px-2 py-0.5 text-xs font-medium bg-yellow-400/20 text-yellow-300 rounded-full">{keyword}</span>
              ))}
            </div>
          </div>
        </section>
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
            <AnalysisIcon className="w-7 h-7 text-purple-400"/>
            <h2 className="text-lg font-bold text-slate-100">{phrase.german}</h2>
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

export default DeepDiveModal;