import React from 'react';
import type { Phrase } from '../types';
import SoundIcon from './icons/SoundIcon';
import ChatIcon from './icons/ChatIcon';
import AnalysisIcon from './icons/AnalysisIcon';
import FilmIcon from './icons/FilmIcon';
import LinkIcon from './icons/LinkIcon';

interface PhraseCardProps {
  phrase: Phrase;
  onSpeak: (text: string) => void;
  isFlipped: boolean;
  onOpenChat: (phrase: Phrase) => void;
  onImproveSkill: () => void;
  onOpenDeepDive: (phrase: Phrase) => void;
  onOpenMovieExamples: (phrase: Phrase) => void;
  onWordClick: (phrase: Phrase, word: string) => void;
  onOpenSentenceChain: (phrase: Phrase) => void;
}

const PhraseCard: React.FC<PhraseCardProps> = ({ phrase, onSpeak, isFlipped, onOpenChat, onImproveSkill, onOpenDeepDive, onOpenMovieExamples, onWordClick, onOpenSentenceChain }) => {

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSpeak(phrase.german);
  }

  const handleOpenChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenChat(phrase);
  }

  const handleImproveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImproveSkill();
  }
  
  const handleOpenDeepDive = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenDeepDive(phrase);
  }

  const handleOpenMovieExamples = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenMovieExamples(phrase);
  }

  const handleWordClick = (e: React.MouseEvent, word: string) => {
    e.stopPropagation();
    // Basic cleaning of punctuation for analysis
    const cleanedWord = word.replace(/[.,!?]/g, '');
    if (cleanedWord) {
      onWordClick(phrase, cleanedWord);
    }
  }

  const handleOpenSentenceChain = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenSentenceChain(phrase);
  }

  return (
    <div className="group [perspective:1000px] w-full max-w-md h-64">
      <div 
        className={`relative w-full h-full rounded-xl shadow-lg transition-transform duration-700 ease-in-out [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
      >
        {/* Front Side (Russian) */}
        <div 
            className="absolute inset-0 [backface-visibility:hidden] bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-xl p-6 flex flex-col justify-between items-center text-center cursor-pointer"
            onClick={handleImproveClick}
        >
            <div className="flex-grow flex flex-col justify-center">
                <h2 className="text-2xl font-semibold text-slate-100">{phrase.russian}</h2>
                <p className="text-slate-400 mt-4">Вспомните перевод</p>
            </div>
            <div
                className="text-sm px-4 py-1.5 rounded-full bg-slate-600/50 group-hover:bg-slate-600 transition-colors text-slate-300"
            >
                Нажмите, чтобы перевернуть
            </div>
        </div>
        
        {/* Back Side (German) */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-gradient-to-br from-purple-600 to-blue-600 border border-purple-500 rounded-xl p-6 flex flex-col justify-between items-center text-center">
            <div className="flex-grow flex items-center justify-center">
                 <h2 className="text-3xl font-bold text-white leading-snug flex flex-wrap justify-center items-center gap-x-1.5">
                    {phrase.german.split(' ').map((word, index) => (
                        <span key={index} onClick={(e) => handleWordClick(e, word)} className="cursor-pointer hover:bg-white/20 px-1.5 py-0.5 rounded-md transition-colors">
                            {word}
                        </span>
                    ))}
                </h2>
            </div>
            <div className="w-full flex justify-center items-center flex-wrap gap-3">
                <button
                    onClick={handleSpeak}
                    className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-200"
                    aria-label="Speak phrase"
                >
                    <SoundIcon className="w-5 h-5 text-white"/>
                </button>
                 <button
                    onClick={handleOpenChat}
                    className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-200"
                    aria-label="Show examples"
                >
                    <ChatIcon className="w-5 h-5 text-white"/>
                </button>
                <button
                    onClick={handleOpenMovieExamples}
                    className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-200"
                    aria-label="Show movie examples"
                >
                    <FilmIcon className="w-5 h-5 text-white"/>
                </button>
                 <button
                    onClick={handleOpenSentenceChain}
                    className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-200"
                    aria-label="Конструктор фраз"
                >
                    <LinkIcon className="w-5 h-5 text-white"/>
                </button>
                <button
                    onClick={handleOpenDeepDive}
                    className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-200"
                    aria-label="Deep analysis"
                >
                    <AnalysisIcon className="w-5 h-5 text-white"/>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PhraseCard;