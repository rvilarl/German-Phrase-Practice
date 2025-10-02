import React from 'react';
import type { Phrase, NounDeclension } from '../types';
import CloseIcon from './icons/CloseIcon';
import TableIcon from './icons/TableIcon';
import AudioPlayer from './AudioPlayer';

interface NounDeclensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  noun: string;
  data: NounDeclension | null;
  isLoading: boolean;
  error: string | null;
  onOpenWordAnalysis: (phrase: Phrase, word: string) => void;
}

type CaseKey = keyof NounDeclension['singular'];

const NounDeclensionSkeleton: React.FC = () => (
    <div className="bg-slate-700/50 p-4 rounded-lg animate-pulse overflow-x-auto hide-scrollbar">
        <div className="w-full min-w-[500px]">
            <div className="flex items-center p-3 border-b border-slate-600">
                <div className="h-5 bg-slate-600 rounded w-1/4"></div>
                <div className="h-5 bg-slate-600 rounded w-1/3 ml-4"></div>
                <div className="h-5 bg-slate-600 rounded w-1/3 ml-4"></div>
            </div>
            <div className="space-y-1 mt-1">
                 {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center p-3 border-b border-slate-700 last:border-b-0">
                        <div className="h-8 bg-slate-600 rounded w-1/4"></div>
                        <div className="h-8 bg-slate-600 rounded w-1/3 ml-4"></div>
                        <div className="h-8 bg-slate-600 rounded w-1/3 ml-4"></div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);


const NounDeclensionModal: React.FC<NounDeclensionModalProps> = ({ isOpen, onClose, noun, data, isLoading, error, onOpenWordAnalysis }) => {
  if (!isOpen) return null;

  const handleWordClick = (contextText: string, word: string) => {
    // FIX: Updated proxy phrase creation to match the new `Phrase` type with a nested `text` object.
    const proxyPhrase: Omit<Phrase, 'id'> & { id?: string } = {
        id: `proxy_noun_${noun}`,
        text: { learning: contextText, native: `Склонение: ${noun}` },
        category: 'general',
        masteryLevel: 0, lastReviewedAt: null, nextReviewAt: Date.now(),
        knowCount: 0, knowStreak: 0, isMastered: false,
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
      return <NounDeclensionSkeleton />;
    }
    if (error) {
      return <div className="flex justify-center items-center h-full"><div className="text-center bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg"><p className="font-semibold">Ошибка</p><p className="text-sm">{error}</p></div></div>;
    }
    if (!data) {
      return <div className="flex justify-center items-center h-full"><p className="text-slate-400">Нет данных.</p></div>;
    }

    const cases: CaseKey[] = ['nominativ', 'akkusativ', 'dativ', 'genitiv'];
    const caseInfo: { [key in CaseKey]: { name: string; question: string } } = {
        nominativ: { name: 'Nominativ', question: '(кто? что?)' },
        akkusativ: { name: 'Akkusativ', question: '(кого? что?)' },
        dativ: { name: 'Dativ', question: '(кому? чему?)' },
        genitiv: { name: 'Genitiv', question: '(кого? чего?)' },
    };
    
    const renderCellContent = (text: string) => (
        <div className="flex items-center justify-between w-full gap-x-2">
            <span className="flex-grow">{renderClickableGerman(text)}</span>
            <AudioPlayer textToSpeak={text} />
        </div>
    );

    return (
        <div className="bg-slate-700/50 p-4 rounded-lg overflow-x-auto hide-scrollbar">
            <table className="w-full min-w-[500px] text-left">
                <thead>
                    <tr className="border-b border-slate-600">
                        <th className="p-3 text-sm font-semibold text-slate-400">Падеж</th>
                        <th className="p-3 text-sm font-semibold text-slate-400">Единственное число</th>
                        <th className="p-3 text-sm font-semibold text-slate-400">Множественное число</th>
                    </tr>
                </thead>
                <tbody>
                    {cases.map(caseKey => (
                        <tr key={caseKey} className="border-b border-slate-700 last:border-b-0">
                            <td className="p-3 text-slate-300 whitespace-nowrap">
                                <div>{caseInfo[caseKey].name}</div>
                                <div className="text-xs text-slate-400">{caseInfo[caseKey].question}</div>
                            </td>
                            <td className="p-3 text-slate-100 font-medium">
                                {renderCellContent(data.singular[caseKey])}
                            </td>
                            <td className="p-3 text-slate-100 font-medium">
                                {renderCellContent(data.plural[caseKey])}
                            </td>
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
        className="bg-slate-800 w-full max-w-xl m-4 rounded-2xl shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <TableIcon className="w-6 h-6 text-purple-400"/>
            <h2 className="text-lg font-bold text-slate-100">Склонение: {noun}</h2>
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

export default NounDeclensionModal;