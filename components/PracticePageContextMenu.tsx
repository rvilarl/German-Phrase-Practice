import React, { useState, useCallback } from 'react';
import type { Phrase, WordAnalysis } from '../types';
import Spinner from './Spinner';
import ListIcon from './icons/ListIcon';
import TrashIcon from './icons/TrashIcon';
import MessageQuestionIcon from './icons/MessageQuestionIcon';
import PlusIcon from './icons/PlusIcon';

const PracticePageContextMenu: React.FC<{
  target: { phrase: Phrase, word?: string };
  onClose: () => void;
  onGoToList: (phrase: Phrase) => void;
  onDelete: (phraseId: string) => void;
  onDiscuss: (phrase: Phrase) => void;
  onAnalyzeWord: (phrase: Phrase, word: string) => Promise<WordAnalysis | null>;
  onCreateCard: (data: { german: string; russian: string }) => void;
}> = ({ target, onClose, onGoToList, onDelete, onDiscuss, onAnalyzeWord, onCreateCard }) => {
  const { phrase, word } = target;
  const [isCreatingCard, setIsCreatingCard] = useState(false);

  const handleGoToList = () => { onGoToList(phrase); onClose(); };
  const handleDiscuss = () => { onDiscuss(phrase); onClose(); };
  const handleDelete = () => { onDelete(phrase.id); onClose(); };

  const getCanonicalGerman = useCallback((analysis: WordAnalysis | null): string | null => {
    if (!analysis) return null;
    if (analysis.verbDetails?.infinitive) return analysis.verbDetails.infinitive;
    if (analysis.nounDetails?.article) return `${analysis.nounDetails.article} ${analysis.word}`;
    return analysis.word;
  }, []);

  const handleCreateCard = async () => {
    if (!word) return;
    setIsCreatingCard(true);
    try {
      const analysis = await onAnalyzeWord(phrase, word);
      if (analysis) {
        const canonicalGerman = getCanonicalGerman(analysis);
        if (canonicalGerman) {
          onCreateCard({ german: canonicalGerman, russian: analysis.translation });
        }
      }
    } catch(e) {
      console.error("Failed to create card from context menu", e);
    } finally {
      setIsCreatingCard(false);
      onClose();
    }
  };


  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-700 rounded-lg shadow-2xl animate-fade-in-center text-white w-64 overflow-hidden"
      >
        {word && (
           <button onClick={handleCreateCard} disabled={isCreatingCard} className="w-full flex items-center px-4 py-3 text-left hover:bg-slate-600 transition-colors">
            {isCreatingCard ? (
                <Spinner className="w-5 h-5 mr-3 text-slate-300 animate-spin" />
            ) : (
                <PlusIcon className="w-5 h-5 mr-3 text-slate-300" />
            )}
            <span>Создать карточку</span>
          </button>
        )}
        <button onClick={handleGoToList} className="w-full flex items-center px-4 py-3 text-left hover:bg-slate-600 transition-colors">
          <ListIcon className="w-5 h-5 mr-3 text-slate-300" />
          <span>Перейти в список</span>
        </button>
         <button onClick={handleDiscuss} className="w-full flex items-center px-4 py-3 text-left hover:bg-slate-600 transition-colors">
          <MessageQuestionIcon className="w-5 h-5 mr-3 text-slate-300" />
          <span>Обсудить перевод</span>
        </button>
        <button onClick={handleDelete} className="w-full flex items-center px-4 py-3 text-left hover:bg-slate-600 transition-colors text-red-400">
          <TrashIcon className="w-5 h-5 mr-3" />
          <span>Удалить</span>
        </button>
      </div>
    </>
  );
};

export default PracticePageContextMenu;
