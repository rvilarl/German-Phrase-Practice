import React from 'react';
import type { Phrase, MovieExample } from '../types';
import CloseIcon from './icons/CloseIcon';
import FilmIcon from './icons/FilmIcon';
import AudioPlayer from './AudioPlayer';

interface MovieExamplesModalProps {
  isOpen: boolean;
  onClose: () => void;
  phrase: Phrase;
  examples: MovieExample[];
  isLoading: boolean;
  error: string | null;
  onOpenWordAnalysis: (phrase: Phrase, word: string) => void;
}

const HighlightedDialogue: React.FC<{ 
    text: string; 
    phraseToHighlight: string;
    basePhrase: Phrase;
    onOpenWordAnalysis: (phrase: Phrase, word: string) => void;
}> = ({ text, phraseToHighlight, basePhrase, onOpenWordAnalysis }) => {
    if (!text) return null;
    
    const handleWordClick = (contextText: string, word: string) => {
        const proxyPhrase = { ...basePhrase, id: `proxy_${basePhrase.id}_movie`, german: contextText };
        onOpenWordAnalysis(proxyPhrase, word);
    };

    const renderClickableText = (textSegment: string, isHighlighted: boolean) => {
        return textSegment.split(/(\s+)/).map((part, i) => {
            if (part.trim() === '') return <span key={i}>{part}</span>; // Keep spaces
            return (
                <span 
                    key={i} 
                    onClick={(e) => {
                        e.stopPropagation();
                        const cleanedWord = part.replace(/[.,!?()"“”:;]/g, '');
                        if (cleanedWord) handleWordClick(text, cleanedWord);
                    }}
                    className={`cursor-pointer hover:bg-white/20 p-0.5 rounded-sm transition-colors ${isHighlighted ? 'font-bold text-purple-300' : ''}`}
                >
                    {part}
                </span>
            );
        });
    };

    const parts = text.split(new RegExp(`(${phraseToHighlight})`, 'gi'));
    return (
        <>{parts.map((part, index) => renderClickableText(part, part.toLowerCase() === phraseToHighlight.toLowerCase()))}</>
    );
};


const MovieExamplesSkeleton: React.FC = () => (
    <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, index) => (
            <div key={index} className="bg-slate-700/50 p-4 rounded-lg">
                <div className="h-5 bg-slate-700 rounded w-1/2 mb-3"></div>
                <div className="flex items-start space-x-3">
                    <div className="w-9 h-9 bg-slate-600 rounded-full flex-shrink-0"></div>
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-700 rounded w-full"></div>
                        <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                        <div className="h-3 bg-slate-600 rounded w-full mt-2"></div>
                    </div>
                </div>
            </div>
        ))}
    </div>
);


const MovieExamplesModal: React.FC<MovieExamplesModalProps> = ({ isOpen, onClose, phrase, examples, isLoading, error, onOpenWordAnalysis }) => {
  if (!isOpen) return null;

  const renderContent = () => {
    if (isLoading) {
      return <MovieExamplesSkeleton />;
    }
    if (error) {
      return <div className="flex justify-center items-center h-full"><div className="text-center bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg"><p className="font-semibold">Ошибка</p><p className="text-sm">{error}</p></div></div>;
    }
    if (examples.length === 0) {
      return <div className="flex justify-center items-center h-full"><p className="text-slate-400">Не удалось найти примеры из фильмов для этой фразы.</p></div>;
    }

    return (
      <div className="space-y-4">
        {examples.map((example, index) => (
            <div key={index} className="bg-slate-700/50 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-200 mb-2">
                    {example.title}
                    {example.titleRussian && <span className="text-slate-400 font-normal"> ({example.titleRussian})</span>}
                </h3>
                <div className="flex items-start space-x-3">
                    <AudioPlayer textToSpeak={example.dialogue} />
                    <div className="flex-1">
                        <p className="text-slate-300 leading-relaxed">
                            <HighlightedDialogue text={example.dialogue} phraseToHighlight={phrase.german} basePhrase={phrase} onOpenWordAnalysis={onOpenWordAnalysis} />
                        </p>
                        {example.dialogueRussian && (
                            <p className="text-slate-400 leading-relaxed italic mt-1 border-l-2 border-slate-600 pl-3">
                                {example.dialogueRussian}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        ))}
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
            <FilmIcon className="w-7 h-7 text-purple-400"/>
            <h2 className="text-lg font-bold text-slate-100">Примеры из фильмов</h2>
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

export default MovieExamplesModal;