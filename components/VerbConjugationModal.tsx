import React from 'react';
import type { Phrase, VerbConjugation } from '../types';
import Spinner from './Spinner';
import CloseIcon from './icons/CloseIcon';
import TableIcon from './icons/TableIcon';
import AudioPlayer from './AudioPlayer';

interface VerbConjugationModalProps {
  isOpen: boolean;
  onClose: () => void;
  infinitive: string;
  data: VerbConjugation | null;
  isLoading: boolean;
  error: string | null;
  onOpenWordAnalysis: (phrase: Phrase, word: string) => void;
}

const VerbConjugationModal: React.FC<VerbConjugationModalProps> = ({ isOpen, onClose, infinitive, data, isLoading, error, onOpenWordAnalysis }) => {
  if (!isOpen) return null;

  const handleWordClick = (contextText: string, word: string) => {
    const proxyPhrase: Omit<Phrase, 'id'> & { id?: string } = {
        id: `proxy_verb_${infinitive}`,
        german: contextText,
        russian: `Спряжение: ${infinitive}`,
        category: 'general',
        masteryLevel: 0, lastReviewedAt: null, nextReviewAt: Date.now(),
        knowCount: 0, knowStreak: 0, isMastered: false,
// FIX: Added missing 'lapses' property to satisfy the Phrase type.
        lapses: 0,
    };
    onOpenWordAnalysis(proxyPhrase as Phrase, word);
  };
  
  const renderClickableGerman = (text: string) => {
      if (!text) return null;
      return text.split(' ').map((word, i, arr) => (
          <span
              key={i}
              onClick={(e) => {
                  e.stopPropagation();
                  const cleanedWord = word.replace(/[.,!?()"“”:;]/g, '');
                  if (cleanedWord) handleWordClick(text, cleanedWord);
              }}
              className="cursor-pointer hover:bg-white/20 px-1 py-0.5 rounded-md transition-colors"
          >
              {word}{i < arr.length - 1 ? ' ' : ''}
          </span>
      ));
  };


  const renderContent = () => {
    if (isLoading) {
      return <div className="flex flex-col justify-center items-center h-full"><Spinner className="h-10 w-10 text-purple-400" /><p className="mt-4 text-slate-400">Загружаем спряжение...</p></div>;
    }
    if (error) {
      return <div className="flex justify-center items-center h-full"><div className="text-center bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg"><p className="font-semibold">Ошибка</p><p className="text-sm">{error}</p></div></div>;
    }
    if (!data) {
      return <div className="flex justify-center items-center h-full"><p className="text-slate-400">Нет данных.</p></div>;
    }

    const conjugationPairs = [
      { pronoun: 'ich', form: data.presentTense.ich },
      { pronoun: 'du', form: data.presentTense.du },
      { pronoun: 'er/sie/es', form: data.presentTense.er_sie_es },
      { pronoun: 'wir', form: data.presentTense.wir },
      { pronoun: 'ihr', form: data.presentTense.ihr },
      { pronoun: 'sie/Sie', form: data.presentTense.sie_Sie },
    ];

    return (
        <div className="bg-slate-700/50 p-4 rounded-lg">
            <table className="w-full text-left">
                <thead>
                    <tr className="border-b border-slate-600">
                        <th className="p-3 w-1/6"><span className="sr-only">Озвучить</span></th>
                        <th className="p-3 text-sm font-semibold text-slate-400">Местоимение</th>
                        <th className="p-3 text-sm font-semibold text-slate-400">Форма глагола</th>
                    </tr>
                </thead>
                <tbody>
                    {conjugationPairs.map(pair => (
                        <tr key={pair.pronoun} className="border-b border-slate-700 last:border-b-0">
                            <td className="p-3">
                                <AudioPlayer textToSpeak={`${pair.pronoun} ${pair.form}`} />
                            </td>
                            <td className="p-3 text-slate-300 text-lg">{pair.pronoun}</td>
                            <td className="p-3 text-slate-100 font-semibold text-lg">{renderClickableGerman(pair.form)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center" onClick={onClose}>
      <div 
        className="bg-slate-800 w-full max-w-md m-4 rounded-2xl shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <TableIcon className="w-6 h-6 text-purple-400"/>
            <h2 className="text-lg font-bold text-slate-100">Спряжение: {infinitive}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700">
            <CloseIcon className="w-6 h-6 text-slate-400"/>
          </button>
        </header>
        <div className="p-6 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default VerbConjugationModal;
