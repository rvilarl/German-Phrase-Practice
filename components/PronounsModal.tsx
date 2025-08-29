import React from 'react';
import { Phrase } from '../types';
import CloseIcon from './icons/CloseIcon';
import UsersIcon from './icons/UsersIcon';
import AudioPlayer from './AudioPlayer';

interface PronounsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWordAnalysis: (phrase: Phrase, word: string) => void;
}

const pronouns = [
    { german: 'ich', russian: 'я' },
    { german: 'du', russian: 'ты' },
    { german: 'er / sie / es', russian: 'он / она / оно' },
    { german: 'wir', russian: 'мы' },
    { german: 'ihr', russian: 'вы (неформ.)' },
    { german: 'sie / Sie', russian: 'они / Вы (форм.)' },
];

const PronounsModal: React.FC<PronounsModalProps> = ({ isOpen, onClose, onOpenWordAnalysis }) => {
  if (!isOpen) return null;

  const handleWordClick = (contextText: string, word: string, russianText: string) => {
    const proxyPhrase: Omit<Phrase, 'id'> & { id?: string } = {
        id: `proxy_pronoun_${word}`,
        german: contextText,
        russian: russianText,
        category: 'pronouns',
        masteryLevel: 0, lastReviewedAt: null, nextReviewAt: Date.now(),
        knowCount: 0, knowStreak: 0, isMastered: false
    };
    onOpenWordAnalysis(proxyPhrase as Phrase, word);
  };
  
  const renderClickableGerman = (text: string, russian: string) => {
      if (!text) return null;
      return text.split(' ').map((word, i, arr) => {
          if (word === '/') return <span key={i}> / </span>;
          return (
              <span
                  key={i}
                  onClick={(e) => {
                      e.stopPropagation();
                      const cleanedWord = word.replace(/[.,!?()"“”:;]/g, '');
                      if (cleanedWord) handleWordClick(text, cleanedWord, russian);
                  }}
                  className="cursor-pointer hover:bg-white/20 px-1 py-0.5 rounded-md transition-colors"
              >
                  {word}
              </span>
          );
      });
  };


  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center" onClick={onClose}>
      <div 
        className="bg-slate-800 w-full max-w-sm m-4 rounded-2xl shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <UsersIcon className="w-6 h-6 text-purple-400"/>
            <h2 className="text-lg font-bold text-slate-100">Личные местоимения</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700">
            <CloseIcon className="w-6 h-6 text-slate-400"/>
          </button>
        </header>
        <div className="p-6 overflow-y-auto">
           <div className="bg-slate-700/50 p-4 rounded-lg">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-600">
                            <th className="p-3 w-1/6"><span className="sr-only">Озвучить</span></th>
                            <th className="p-3 text-sm font-semibold text-slate-400">Немецкий</th>
                            <th className="p-3 text-sm font-semibold text-slate-400">Русский</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pronouns.map(p => (
                            <tr key={p.german} className="border-b border-slate-700 last:border-b-0">
                                <td className="p-3">
                                  <AudioPlayer textToSpeak={p.german.replace(/ \/ /g, ', ')} />
                                </td>
                                <td className="p-3 text-slate-100 font-semibold text-lg whitespace-nowrap">{renderClickableGerman(p.german, p.russian)}</td>
                                <td className="p-3 text-slate-300 text-lg">{p.russian}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PronounsModal;