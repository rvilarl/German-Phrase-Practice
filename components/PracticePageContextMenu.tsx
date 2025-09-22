import React, { useState, useEffect, useCallback } from 'react';
import type { Phrase, WordAnalysis } from '../types';
import Spinner from './Spinner';
import ListIcon from './icons/ListIcon';
import TrashIcon from './icons/TrashIcon';
import MessageQuestionIcon from './icons/MessageQuestionIcon';
import PlusIcon from './icons/PlusIcon';
import InfoIcon from './icons/InfoIcon';
import TableIcon from './icons/TableIcon';

interface PracticePageContextMenuProps {
  target: { phrase: Phrase, word?: string };
  onClose: () => void;
  onGoToList: (phrase: Phrase) => void;
  onDelete: (phraseId: string) => void;
  onDiscuss: (phrase: Phrase) => void;
  onAnalyzeWord: (phrase: Phrase, word: string) => Promise<WordAnalysis | null>;
  onCreateCard: (data: { german: string; russian: string }) => void;
  onOpenWordAnalysis: (phrase: Phrase, word: string) => void;
  onOpenVerbConjugation: (infinitive: string) => void;
  onOpenNounDeclension: (noun: string, article: string) => void;
  onOpenAdjectiveDeclension: (adjective: string) => void;
}

const PracticePageContextMenu: React.FC<PracticePageContextMenuProps> = ({
  target,
  onClose,
  onGoToList,
  onDelete,
  onDiscuss,
  onAnalyzeWord,
  onCreateCard,
  onOpenWordAnalysis,
  onOpenVerbConjugation,
  onOpenNounDeclension,
  onOpenAdjectiveDeclension,
}) => {
  const { phrase, word } = target;
  const [analysis, setAnalysis] = useState<WordAnalysis | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(!!word);
  const [isCreatingCard, setIsCreatingCard] = useState(false);

  useEffect(() => {
    if (!word) {
      return;
    }
    let isMounted = true;
    const analyze = async () => {
      setIsAnalysisLoading(true);
      const result = await onAnalyzeWord(phrase, word);
      if (isMounted) {
        setAnalysis(result);
        setIsAnalysisLoading(false);
      }
    };
    analyze();
    return () => {
      isMounted = false;
    };
  }, [word, phrase, onAnalyzeWord]);

  const handleAction = (action: () => void) => {
    onClose();
    setTimeout(action, 100);
  };

  const getCanonicalGerman = useCallback((): string | null => {
    if (!analysis) return null;
    if (analysis.verbDetails?.infinitive) return analysis.verbDetails.infinitive;
    if (analysis.nounDetails?.article) return `${analysis.nounDetails.article} ${analysis.word}`;
    return analysis.baseForm || analysis.word;
  }, [analysis]);

  const handleCreateCard = useCallback(async () => {
    if (!analysis) return;
    setIsCreatingCard(true);
    const canonicalGerman = getCanonicalGerman();
    if (canonicalGerman) {
      onCreateCard({ german: canonicalGerman, russian: analysis.translation });
    }
    // No need to set isCreatingCard to false, the modal will close.
    // However, if the action is quick, we can keep it for visual feedback.
    setTimeout(() => setIsCreatingCard(false), 1000);
  }, [analysis, getCanonicalGerman, onCreateCard]);

  const renderMenuItems = () => {
    const wordSpecificItems = word ? [
      { label: 'Сведения о слове', icon: <InfoIcon className="w-5 h-5 mr-3 text-slate-300" />, action: () => handleAction(() => onOpenWordAnalysis(phrase, word)), condition: !!analysis },
      { label: 'Создать карточку', icon: <PlusIcon className="w-5 h-5 mr-3 text-slate-300" />, action: () => handleAction(handleCreateCard), condition: !!analysis, loading: isCreatingCard },
      { label: 'Спряжение глагола', icon: <TableIcon className="w-5 h-5 mr-3 text-slate-300" />, action: () => handleAction(() => onOpenVerbConjugation(analysis!.verbDetails!.infinitive)), condition: !!analysis?.verbDetails },
      { label: 'Склонение существительного', icon: <TableIcon className="w-5 h-5 mr-3 text-slate-300" />, action: () => handleAction(() => onOpenNounDeclension(analysis!.word, analysis!.nounDetails!.article)), condition: !!analysis?.nounDetails },
      { label: 'Склонение прилагательного', icon: <TableIcon className="w-5 h-5 mr-3 text-slate-300" />, action: () => handleAction(() => onOpenAdjectiveDeclension(analysis!.baseForm || analysis!.word)), condition: analysis?.partOfSpeech === 'Прилагательное' },
    ] : [];

    const phraseSpecificItems = [
      { label: 'Перейти в список', icon: <ListIcon className="w-5 h-5 mr-3 text-slate-300" />, action: () => handleAction(() => onGoToList(phrase)), condition: true },
      { label: 'Обсудить перевод', icon: <MessageQuestionIcon className="w-5 h-5 mr-3 text-slate-300" />, action: () => handleAction(() => onDiscuss(phrase)), condition: true },
      { label: 'Удалить', icon: <TrashIcon className="w-5 h-5 mr-3" />, action: () => handleAction(() => onDelete(phrase.id)), condition: true, isDestructive: true },
    ];
    
    return (
      <>
        {word && (
          <div className="px-4 py-3 border-b border-slate-600">
            <p className="text-lg font-bold text-purple-300 break-words">{word}</p>
            {isAnalysisLoading ? (
                 <div className="h-4 w-2/3 bg-slate-600 rounded animate-pulse mt-1"></div>
            ) : analysis ? (
                <p className="text-sm text-slate-400 capitalize">{analysis.translation}</p>
            ) : <p className="text-sm text-slate-400">Не удалось проанализировать</p>}
          </div>
        )}
        <div className="p-1">
          {word && isAnalysisLoading && (
            <div className="flex items-center px-3 py-3 text-sm text-slate-400">
              <Spinner className="w-5 h-5 mr-3 text-slate-300"/>
              <span>Анализ...</span>
            </div>
          )}

          {!isAnalysisLoading && word && wordSpecificItems.filter(item => item.condition).map((item, index) => (
            <button key={index} onClick={item.action} disabled={item.loading} className="w-full flex items-center px-3 py-2 text-left text-sm hover:bg-slate-600/70 transition-colors rounded-md disabled:opacity-50">
              {item.loading ? <Spinner className="w-5 h-5 mr-3 text-slate-300"/> : item.icon}
              <span>{item.label}</span>
            </button>
          ))}
          
          {word && !isAnalysisLoading && wordSpecificItems.filter(item => item.condition).length > 0 && <hr className="border-slate-600 my-1 mx-2" />}

          {phraseSpecificItems.map((item, index) => (
             <button key={index} onClick={item.action} className={`w-full flex items-center px-3 py-2 text-left text-sm hover:bg-slate-600/70 transition-colors rounded-md ${item.isDestructive ? 'text-red-400' : ''}`}>
               {item.icon}
               <span>{item.label}</span>
             </button>
          ))}
        </div>
      </>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-700/90 backdrop-blur-sm border border-slate-600 rounded-lg shadow-2xl animate-fade-in-center text-white w-64 overflow-hidden"
      >
        {renderMenuItems()}
      </div>
    </>
  );
};

export default PracticePageContextMenu;