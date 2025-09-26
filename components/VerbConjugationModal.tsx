import React from 'react';
import type { Phrase, VerbConjugation, TenseForms } from '../types';
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

const VerbConjugationSkeleton: React.FC = () => (
    <div className="bg-slate-700/50 p-2 sm:p-4 rounded-lg animate-pulse">
        <div className="w-full min-w-[700px] border-separate" style={{ borderSpacing: '0.5rem' }}>
            {/* Header */}
            <div className="flex">
                <div className="w-[120px]"></div>
                <div className="flex-1 h-8 bg-slate-600 rounded"></div>
                <div className="flex-1 h-8 bg-slate-600 rounded"></div>
                <div className="flex-1 h-8 bg-slate-600 rounded"></div>
            </div>
            {/* Rows */}
            {[...Array(3)].map((_, i) => (
                <div key={i} className="flex mt-2">
                    <div className="w-[120px] h-28 bg-slate-600 rounded"></div>
                    <div className="flex-1 h-28 bg-slate-600 rounded"></div>
                    <div className="flex-1 h-28 bg-slate-600 rounded"></div>
                    <div className="flex-1 h-28 bg-slate-600 rounded"></div>
                </div>
            ))}
        </div>
    </div>
);


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
      return <VerbConjugationSkeleton />;
    }
    if (error) {
      return <div className="flex justify-center items-center h-full"><div className="text-center bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg"><p className="font-semibold">Ошибка</p><p className="text-sm">{error}</p></div></div>;
    }
    if (!data) {
      return <div className="flex justify-center items-center h-full"><p className="text-slate-400">Нет данных.</p></div>;
    }
    
    const tenses: { key: keyof Pick<VerbConjugation, 'present' | 'past' | 'future'>, name: string }[] = [
        { key: 'present', name: 'Настоящее' },
        { key: 'past', name: 'Прошедшее (Perfekt)' },
        { key: 'future', name: 'Будущее (Futur I)' },
    ];
    const forms: { key: keyof TenseForms, name: string }[] = [
        { key: 'statement', name: 'Утверждение' },
        { key: 'question', name: 'Вопрос' },
        { key: 'negative', name: 'Отрицание' },
    ];

    return (
        <div className="bg-slate-700/50 p-2 sm:p-4 rounded-lg overflow-x-auto hide-scrollbar">
            <table className="w-full min-w-[700px] text-left border-separate" style={{ borderSpacing: '0.5rem' }}>
                <thead>
                    <tr>
                        <th className="p-2"></th>
                        {tenses.map(tense => (
                            <th key={tense.key} className="p-3 text-center font-bold text-purple-300">{tense.name}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {forms.map(form => (
                        <tr key={form.key}>
                            <th className="p-3 font-bold text-purple-300 align-middle text-center">{form.name}</th>
                            {tenses.map(tense => {
                                const cellData = data[tense.key]?.[form.key];
                                if (!cellData) return <td key={`${tense.key}-${form.key}`} className="bg-slate-800/60 p-3 rounded-lg align-top"></td>;
                                return (
                                    <td key={`${tense.key}-${form.key}`} className="bg-slate-800/60 p-3 rounded-lg align-top">
                                        <div className="flex flex-col justify-between min-h-[100px]">
                                            <div>
                                                <p className="text-slate-100 font-medium">{renderClickableGerman(cellData.german)}</p>
                                                <p className="text-xs text-slate-400 italic mt-1">«{cellData.russian}»</p>
                                            </div>
                                            <div className="self-end mt-2">
                                                <AudioPlayer textToSpeak={cellData.german} />
                                            </div>
                                        </div>
                                    </td>
                                );
                            })}
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
        className="bg-slate-800 w-full max-w-3xl m-4 rounded-2xl shadow-2xl flex flex-col"
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