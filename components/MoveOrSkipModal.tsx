import React from 'react';
import { Category, Phrase, ProposedCard } from '../types';
import FolderMoveIcon from './icons/FolderMoveIcon';

interface MoveOrSkipModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviewData: {
    duplicates: { existingPhrase: Phrase; proposedCard: ProposedCard }[];
    newCards: ProposedCard[];
    targetCategory: Category;
  } | null;
  categories: Category[];
  onMove: (phraseIdsToMove: string[], newCards: ProposedCard[], targetCategory: Category) => void;
  onAddOnlyNew: (newCards: ProposedCard[], targetCategory: Category) => void;
}

const MoveOrSkipModal: React.FC<MoveOrSkipModalProps> = ({ isOpen, onClose, reviewData, categories, onMove, onAddOnlyNew }) => {
  if (!isOpen || !reviewData) return null;

  const { duplicates, newCards, targetCategory } = reviewData;
  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || id;

  const handleMove = () => {
    const idsToMove = duplicates.map(d => d.existingPhrase.id);
    onMove(idsToMove, newCards, targetCategory);
  };

  const handleAddOnlyNew = () => {
    onAddOnlyNew(newCards, targetCategory);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[80] flex justify-center items-center backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-lg m-4 flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-start p-4 border-b border-slate-700 space-x-3">
          <div className="w-10 h-10 rounded-full bg-amber-900/50 flex items-center justify-center flex-shrink-0">
            <FolderMoveIcon className="w-5 h-5 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Найдены дубликаты</h2>
        </header>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto hide-scrollbar">
            <p className="text-slate-300">
                Найдено {duplicates.length} {duplicates.length === 1 ? 'карточка' : 'карточки'}, которые уже существуют в других категориях.
                {newCards.length > 0 && ` Также будет добавлено ${newCards.length} новых.`}
            </p>
            <div className="bg-slate-900/50 p-3 rounded-lg max-h-48 overflow-y-auto hide-scrollbar">
                <ul className="space-y-2">
                    {duplicates.map(({ existingPhrase }, index) => (
                        <li key={index} className="text-sm text-slate-400">
                            <span className="font-semibold text-slate-200">"{existingPhrase.german}"</span> (в категории "{getCategoryName(existingPhrase.category)}")
                        </li>
                    ))}
                </ul>
            </div>
            <p className="text-slate-300">Что вы хотите сделать?</p>
        </div>

        <footer className="p-4 border-t border-slate-700 flex flex-col sm:flex-row gap-3">
          <button onClick={handleMove} className="w-full px-4 py-3 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors">
            Переместить {duplicates.length} в "{targetCategory.name}"
          </button>
          {newCards.length > 0 && (
            <button onClick={handleAddOnlyNew} className="w-full px-4 py-3 rounded-md bg-slate-600 hover:bg-slate-700 text-white font-semibold transition-colors">
              Добавить только {newCards.length} новых
            </button>
          )}
          <button onClick={onClose} className="w-full sm:w-auto px-4 py-3 rounded-md bg-transparent hover:bg-slate-700/50 text-slate-300 font-medium transition-colors">
            Отмена
          </button>
        </footer>
      </div>
    </div>
  );
};

export default MoveOrSkipModal;
