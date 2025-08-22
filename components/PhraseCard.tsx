import React, { useRef } from 'react';
import type { Phrase } from '../types';
import SoundIcon from './icons/SoundIcon';
import ChatIcon from './icons/ChatIcon';
import AnalysisIcon from './icons/AnalysisIcon';
import FilmIcon from './icons/FilmIcon';
import LinkIcon from './icons/LinkIcon';
import WandIcon from './icons/WandIcon';
import BlocksIcon from './icons/BlocksIcon';

interface PhraseCardProps {
  phrase: Phrase;
  onSpeak: (text: string) => void;
  isFlipped: boolean;
  onFlip: () => void;
  onOpenChat: (phrase: Phrase) => void;
  onImproveSkill: () => void;
  onOpenDeepDive: (phrase: Phrase) => void;
  onOpenMovieExamples: (phrase: Phrase) => void;
  onWordClick: (phrase: Phrase, word: string) => void;
  onOpenSentenceChain: (phrase: Phrase) => void;
  onOpenImprovePhrase: (phrase: Phrase) => void;
  onOpenPhraseBuilder: (phrase: Phrase) => void;
  onOpenContextMenu: (phrase: Phrase) => void;
}

const PhraseCard: React.FC<PhraseCardProps> = ({
  phrase, onSpeak, isFlipped, onFlip, onOpenChat, onImproveSkill,
  onOpenDeepDive, onOpenMovieExamples, onWordClick, onOpenSentenceChain,
  onOpenImprovePhrase, onOpenPhraseBuilder, onOpenContextMenu
}) => {

  const longPressTimer = useRef<number | null>(null);

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
  
  const handleOpenImprovePhrase = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenImprovePhrase(phrase);
  }

  const handleWordClick = (e: React.MouseEvent, word: string) => {
    e.stopPropagation();
    const cleanedWord = word.replace(/[.,!?]/g, '');
    if (cleanedWord) {
      onWordClick(phrase, cleanedWord);
    }
  }

  const handleOpenSentenceChain = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenSentenceChain(phrase);
  }
  
  const handleOpenPhraseBuilder = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenPhraseBuilder(phrase);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    longPressTimer.current = window.setTimeout(() => {
      onOpenContextMenu(phrase);
      longPressTimer.current = null;
    }, 500); // 500ms for long press
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  return (
    <div 
        className="group [perspective:1000px] w-full max-w-md h-full"
        onPointerDown={handlePointerDown}
        onPointerUp={clearLongPress}
        onPointerLeave={clearLongPress}
        onContextMenu={(e) => {
            e.preventDefault();
            onOpenContextMenu(phrase);
        }}
    >
      <div 
        className={`relative w-full h-full rounded-xl shadow-lg transition-transform duration-700 ease-in-out [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
      >
        {/* Front Side (Russian) */}
        <div 
            className="absolute inset-0 [backface-visibility:hidden] bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-xl p-6 flex flex-col justify-between items-center text-center"
        >
            <div className="flex-grow flex flex-col justify-center w-full cursor-pointer" onClick={handleImproveClick}>
                <h2 className="text-2xl font-semibold text-slate-100">{phrase.russian}</h2>
                <p className="text-slate-400 mt-4">Вспомните перевод</p>
            </div>
            <div className="w-full flex justify-center items-center gap-x-4 pt-4">
               <button
                   onClick={handleOpenPhraseBuilder}
                   className="p-3 rounded-full bg-slate-600/50 hover:bg-slate-600 transition-colors text-slate-100"
                   aria-label="Конструктор фраз"
               >
                   <BlocksIcon className="w-5 h-5" />
               </button>
           </div>
        </div>
        
        {/* Back Side (German) */}
        <div 
          onClick={onFlip}
          className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-gradient-to-br from-purple-600 to-blue-600 border border-purple-500 rounded-xl p-6 flex flex-col justify-between items-center text-center cursor-pointer"
        >
            <button
                onClick={handleOpenImprovePhrase}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-200 z-10"
                aria-label="Улучшить перевод"
            >
                <WandIcon className="w-5 h-5 text-white"/>
            </button>

            <div className="flex-grow flex items-center justify-center">
                 <h2 className="text-3xl font-bold text-white leading-snug flex flex-wrap justify-center items-center gap-x-1.5">
                    {phrase.german.split(' ').map((word, index) => (
                        <span key={index} onClick={(e) => handleWordClick(e, word)} className="cursor-pointer hover:bg-white/20 px-1.5 py-0.5 rounded-md transition-colors">
                            {word}
                        </span>
                    ))}
                </h2>
            </div>
            <div className="w-full flex justify-center items-center flex-wrap gap-3 pt-4">
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