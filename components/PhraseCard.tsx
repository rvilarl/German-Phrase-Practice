import React, { useRef } from 'react';
import type { Phrase } from '../types';
import SoundIcon from './icons/SoundIcon';
import ChatIcon from './icons/ChatIcon';
import AnalysisIcon from './icons/AnalysisIcon';
import FilmIcon from './icons/FilmIcon';
import LinkIcon from './icons/LinkIcon';
import SettingsIcon from './icons/SettingsIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import { getPhraseCategory } from '../services/srsService';

interface PhraseCardProps {
  phrase: Phrase;
  onSpeak: (text: string) => void;
  isFlipped: boolean;
  onOpenChat: (phrase: Phrase) => void;
  onOpenDeepDive: (phrase: Phrase) => void;
  onOpenMovieExamples: (phrase: Phrase) => void;
  onWordClick: (phrase: Phrase, word: string) => void;
  onOpenSentenceChain: (phrase: Phrase) => void;
  onOpenImprovePhrase: (phrase: Phrase) => void;
  onOpenContextMenu: (target: { phrase: Phrase, word?: string }) => void;
  onOpenVoicePractice: (phrase: Phrase) => void;
  onOpenLearningAssistant: (phrase: Phrase) => void;
  onOpenQuickReply: (phrase: Phrase) => void;
  isWordAnalysisLoading: boolean;
  isQuickReplyEligible: boolean;
}

const RussianPhraseDisplay: React.FC<{ text: string; as: 'h2' | 'div' }> = ({ text, as: Component }) => {
  const match = text.match(/(.*?)\s*\(([^)]+)\)/);
  if (match && match[1] && match[2]) {
    const mainText = match[1].trim();
    const noteText = match[2].trim();
    return (
      <Component className="text-2xl font-semibold text-slate-100">
        {mainText}
        <p className="text-sm text-slate-400 mt-1 font-normal">({noteText})</p>
      </Component>
    );
  }
  return <Component className="text-2xl font-semibold text-slate-100">{text}</Component>;
};

const PhraseCard: React.FC<PhraseCardProps> = ({
  phrase, onSpeak, isFlipped, onOpenChat,
  onOpenDeepDive, onOpenMovieExamples, onWordClick, onOpenSentenceChain,
  onOpenImprovePhrase, onOpenContextMenu, onOpenVoicePractice,
  onOpenLearningAssistant, onOpenQuickReply, isWordAnalysisLoading,
  isQuickReplyEligible
}) => {

  const longPressTimer = useRef<number | null>(null);
  const wordLongPressTimer = useRef<number | null>(null);

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSpeak(phrase.german);
  }

  const handleOpenChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenChat(phrase);
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
    if (isWordAnalysisLoading) return;
    const cleanedWord = word.replace(/[.,!?]/g, '');
    if (cleanedWord) {
      onWordClick(phrase, cleanedWord);
    }
  }

  const handleOpenSentenceChain = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenSentenceChain(phrase);
  }
  
  const handleOpenVoicePractice = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenVoicePractice(phrase);
  };
  
  const handleOpenLearningAssistant = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenLearningAssistant(phrase);
  };

  const handleQuickReplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenQuickReply(phrase);
  };


  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    longPressTimer.current = window.setTimeout(() => {
      onOpenContextMenu({ phrase });
      longPressTimer.current = null;
    }, 500); // 500ms for long press
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleWordPointerDown = (e: React.PointerEvent<HTMLSpanElement>, word: string) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.stopPropagation(); // prevent card's context menu
    if (isWordAnalysisLoading) return;
    const cleanedWord = word.replace(/[.,!?]/g, '');
    if (!cleanedWord) return;

    wordLongPressTimer.current = window.setTimeout(() => {
        onOpenContextMenu({ phrase, word: cleanedWord });
        wordLongPressTimer.current = null;
    }, 500);
  };

  const clearWordLongPress = (e: React.PointerEvent<HTMLSpanElement>) => {
      e.stopPropagation();
      if (wordLongPressTimer.current) {
          clearTimeout(wordLongPressTimer.current);
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
            onOpenContextMenu({ phrase });
        }}
    >
      <div 
        className={`relative w-full h-full rounded-xl shadow-lg transition-transform duration-700 ease-in-out [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
      >
        {/* Front Side (Russian) */}
        <div 
            className={`h-full absolute inset-0 [backface-visibility:hidden] bg-gradient-to-br from-slate-700/80 to-slate-800/80 backdrop-blur-sm border border-white/10 rounded-xl p-6 flex flex-col justify-between items-center text-center transition-colors duration-500 relative overflow-hidden`}
        >
            <button
                onClick={handleOpenImprovePhrase}
                className="absolute top-3 right-3 p-2 rounded-full text-slate-300 hover:bg-slate-600/50 hover:text-white transition-colors z-10"
                aria-label="Улучшить перевод"
            >
                <SettingsIcon className="w-5 h-5" />
            </button>
            <div className="flex-grow flex flex-col items-center justify-center w-full">
                {isQuickReplyEligible ? (
                    <button
                        onClick={handleQuickReplyClick}
                        className="group/quick-reply relative text-center p-4 -m-4 rounded-lg hover:bg-slate-600/50 transition-colors"
                    >
                        <RussianPhraseDisplay text={phrase.russian} as="div" />
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 border-2 border-slate-800 bg-purple-400 rounded-full opacity-70 group-hover/quick-reply:opacity-100" />
                    </button>
                    ) : (
                    <RussianPhraseDisplay text={phrase.russian} as="h2" />
                )}
            </div>
            
            <div className="w-full flex justify-center items-center flex-wrap gap-2">
                <button
                   onClick={handleOpenLearningAssistant}
                   className="p-3 rounded-full bg-slate-600/50 hover:bg-slate-600 transition-colors text-slate-100"
                   aria-label="Изучать с AI"
               >
                   <BookOpenIcon className="w-5 h-5" />
               </button>
                <button
                    onClick={handleOpenSentenceChain}
                    className="p-3 rounded-full bg-slate-600/50 hover:bg-slate-600 transition-colors text-slate-100"
                    aria-label="Цепочка фраз"
                >
                    <LinkIcon className="w-5 h-5" />
                </button>
                 <button
                    onClick={handleOpenVoicePractice}
                    className="p-3 rounded-full bg-slate-600/50 hover:bg-slate-600 transition-colors text-slate-100"
                    aria-label="Голосовая практика"
                >
                    <MicrophoneIcon className="w-5 h-5" />
                </button>
                 <button onClick={handleOpenChat} className="p-3 rounded-full bg-slate-600/50 hover:bg-slate-600 transition-colors text-slate-100" aria-label="Обсудить с AI">
                    <ChatIcon className="w-5 h-5" />
                </button>
                <button onClick={handleOpenDeepDive} className="p-3 rounded-full bg-slate-600/50 hover:bg-slate-600 transition-colors text-slate-100" aria-label="Глубокий анализ">
                    <AnalysisIcon className="w-5 h-5" />
                </button>
                <button onClick={handleOpenMovieExamples} className="p-3 rounded-full bg-slate-600/50 hover:bg-slate-600 transition-colors text-slate-100" aria-label="Примеры из фильмов">
                    <FilmIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="flash-container"></div>
        </div>

        {/* Back Side (German) */}
        <div className="h-full absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden] bg-gradient-to-br from-purple-600/90 to-blue-600/90 backdrop-blur-sm border border-white/10 rounded-xl p-6 flex flex-col justify-between items-center text-center transition-colors duration-500">
            <div className="flex-grow flex flex-col items-center justify-center w-full">
                <button
                    onClick={handleOpenImprovePhrase}
                    className="absolute top-3 right-3 p-2 rounded-full text-slate-200 hover:bg-black/20 hover:text-white transition-colors z-10"
                    aria-label="Улучшить перевод"
                >
                    <SettingsIcon className="w-5 h-5" />
                </button>
                <div className="text-2xl font-bold text-white flex flex-wrap justify-center items-center gap-x-1">
                    {phrase.german.split(' ').map((word, index) => (
                      <span 
                        key={index} 
                        className={`cursor-pointer hover:bg-white/20 px-1 py-0.5 rounded-md transition-colors ${isWordAnalysisLoading ? 'opacity-50 pointer-events-none' : ''}`}
                        onClick={(e) => handleWordClick(e, word)}
                        onPointerDown={(e) => handleWordPointerDown(e, word)}
                        onPointerUp={clearWordLongPress}
                        onPointerLeave={clearWordLongPress}
                      >
                          {word}
                      </span>
                    ))}
                </div>
            </div>

            <div className="w-full flex justify-center items-center flex-wrap gap-2">
                <button onClick={handleSpeak} className="p-3 rounded-full bg-black/20 hover:bg-black/30 transition-colors text-white" aria-label="Озвучить">
                    <SoundIcon className="w-5 h-5" />
                </button>
                <button
                   onClick={handleOpenLearningAssistant}
                   className="p-3 rounded-full bg-black/20 hover:bg-black/30 transition-colors text-white"
                   aria-label="Изучать с AI"
               >
                   <BookOpenIcon className="w-5 h-5" />
               </button>
                <button
                    onClick={handleOpenSentenceChain}
                    className="p-3 rounded-full bg-black/20 hover:bg-black/30 transition-colors text-white"
                    aria-label="Цепочка фраз"
                >
                    <LinkIcon className="w-5 h-5" />
                </button>
                 <button
                    onClick={handleOpenVoicePractice}
                    className="p-3 rounded-full bg-black/20 hover:bg-black/30 transition-colors text-white"
                    aria-label="Голосовая практика"
                >
                    <MicrophoneIcon className="w-5 h-5" />
                </button>
                 <button onClick={handleOpenChat} className="p-3 rounded-full bg-black/20 hover:bg-black/30 transition-colors text-white" aria-label="Обсудить с AI">
                    <ChatIcon className="w-5 h-5" />
                </button>
                <button onClick={handleOpenDeepDive} className="p-3 rounded-full bg-black/20 hover:bg-black/30 transition-colors text-white" aria-label="Глубокий анализ">
                    <AnalysisIcon className="w-5 h-5" />
                </button>
                <button onClick={handleOpenMovieExamples} className="p-3 rounded-full bg-black/20 hover:bg-black/30 transition-colors text-white" aria-label="Примеры из фильмов">
                    <FilmIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="flash-container"></div>
        </div>
      </div>
    </div>
  );
};

export default PhraseCard;
