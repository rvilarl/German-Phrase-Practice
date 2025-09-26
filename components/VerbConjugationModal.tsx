import React, { useState } from 'react';
import type { Phrase, VerbConjugation, TenseForms, PronounConjugation } from '../types';
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
    <div className="space-y-6 animate-pulse">
        {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-slate-900/50 rounded-lg overflow-hidden">
                <div className="p-4">
                    <div className="h-6 w-1/2 bg-slate-700 rounded"></div>
                </div>
                <div className="px-4 flex space-x-4 border-b border-slate-700">
                    <div className="h-9 w-28 bg-slate-700/50"></div>
                    <div className="h-9 w-20 bg-slate-700/50"></div>
                </div>
                <div className="p-4 space-y-4">
                    {[...Array(4)].map((_, j) => (
                        <div key={j} className="flex items-center space-x-3">
                            <div className="h-5 w-16 bg-slate-700 rounded"></div>
                            <div className="flex-grow space-y-1">
                                <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                                <div className="h-3 bg-slate-700 rounded w-3/4"></div>
                            </div>
                            <div className="h-8 w-8 bg-slate-700 rounded-full"></div>
                        </div>
                    ))}
                </div>
            </div>
        ))}
    </div>
);


const VerbConjugationModal: React.FC<VerbConjugationModalProps> = ({ isOpen, onClose, infinitive, data, isLoading, error, onOpenWordAnalysis }) => {
  const [activeTabs, setActiveTabs] = useState({
    present: 'statement' as keyof TenseForms,
    past: 'statement' as keyof TenseForms,
    future: 'statement' as keyof TenseForms,
  });

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
  
  const renderTenseSection = (tenseKey: 'present' | 'past' | 'future', title: string) => {
    if (!data) return null;
    const tenseData = data[tenseKey];
    if (!tenseData) return null;

    const forms: { key: keyof TenseForms; name: string }[] = [
      { key: 'statement', name: 'Утверждение' },
      { key: 'question', name: 'Вопрос' },
      { key: 'negative', name: 'Отрицание' },
    ];
    
    const activeTab = activeTabs[tenseKey];
    const cellData = tenseData[activeTab];
    
    return (
      <section className="bg-slate-900/50 rounded-lg overflow-hidden border border-slate-700/50">
        <h3 className="text-xl font-bold text-slate-100 p-4 bg-slate-800/50">{title}</h3>
        <div className="flex border-b border-slate-700 px-4">
          {forms.map(form => (
            <button
              key={form.key}
              onClick={() => setActiveTabs(prev => ({ ...prev, [tenseKey]: form.key }))}
              className={`px-3 sm:px-4 py-2 text-sm font-semibold transition-colors focus:outline-none -mb-px ${
                activeTab === form.key
                  ? 'border-b-2 border-purple-400 text-purple-300'
                  : 'text-slate-400 hover:text-slate-200 border-b-2 border-transparent'
              }`}
            >
              {form.name}
            </button>
          ))}
        </div>
        <div className="p-4 space-y-3">
          {cellData?.map((conj: PronounConjugation) => (
            <div key={conj.pronoun} className="grid grid-cols-[80px_1fr_auto] items-center gap-x-3 text-sm">
                <span className="font-mono text-purple-300 text-right">{conj.pronoun}</span>
                <div className="min-w-0">
                    <p className="text-slate-100 font-medium truncate">{renderClickableGerman(conj.german)}</p>
                    <p className="text-xs text-slate-400 italic truncate">«{conj.russian}»</p>
                </div>
                <AudioPlayer textToSpeak={conj.german} />
            </div>
          ))}
        </div>
      </section>
    );
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
    
    return (
      <div className="space-y-6">
        {renderTenseSection('present', 'Präsens (Настоящее)')}
        {renderTenseSection('past', 'Perfekt (Прошедшее)')}
        {renderTenseSection('future', 'Futur I (Будущее)')}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center p-4" onClick={onClose}>
      <div 
        className="bg-slate-800 w-full max-w-3xl m-4 rounded-2xl shadow-2xl flex flex-col h-[90vh]"
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
        <div className="p-4 sm:p-6 flex-grow overflow-y-auto hide-scrollbar">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default VerbConjugationModal;