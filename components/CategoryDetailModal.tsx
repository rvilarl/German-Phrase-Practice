import React from 'react';
import { Category, Phrase, PhraseCategory } from '../types';
import CloseIcon from './icons/CloseIcon';
import PlusIcon from './icons/PlusIcon';
import PhraseListItem from './PhraseListItem';
import SmartToyIcon from './icons/SmartToyIcon';

interface CategoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  phrases: Phrase[];
  allCategories: Category[];
  onUpdatePhraseCategory: (phraseId: string, newCategoryId: string) => void;
  onEditPhrase: (phrase: Phrase) => void;
  onDeletePhrase: (phraseId: string) => void;
  onPreviewPhrase: (phrase: Phrase) => void;
  onStartPractice: (phrase: Phrase) => void;
  onAddPhrase: () => void;
  onAIAssist: (category: Category) => void;
}

const CategoryDetailModal: React.FC<CategoryDetailModalProps> = ({
  isOpen, onClose, category, phrases, allCategories, onUpdatePhraseCategory, onEditPhrase, onDeletePhrase, onPreviewPhrase, onStartPractice, onAddPhrase, onAIAssist
}) => {
  if (!isOpen || !category) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-[70] flex justify-center items-center backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-2xl m-4 flex flex-col h-[90vh]" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <span className={`w-5 h-5 rounded-full ${category.color}`}></span>
            <h2 className="text-lg font-bold text-slate-100">{category.name}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700">
            <CloseIcon className="w-6 h-6 text-slate-400" />
          </button>
        </header>

        <div className="p-4 flex-grow overflow-y-auto hide-scrollbar">
          {phrases.length > 0 ? (
            <>
              <ul className="space-y-2">
                {phrases.map(phrase => (
                  <PhraseListItem
                    key={phrase.id}
                    phrase={phrase}
                    onEdit={onEditPhrase}
                    onDelete={onDeletePhrase}
                    isDuplicate={false}
                    isHighlighted={false}
                    onPreview={onPreviewPhrase}
                    onStartPractice={onStartPractice}
                    categoryInfo={category}
                    allCategories={allCategories}
                    onUpdatePhraseCategory={onUpdatePhraseCategory}
                    onCategoryClick={() => {}}
                  />
                ))}
              </ul>
               <div className="mt-6 flex justify-center items-center gap-4 py-4 border-t border-slate-700/50">
                  <button onClick={onAddPhrase} className="flex items-center gap-x-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700/80 rounded-lg transition-colors text-slate-200 font-semibold">
                      <PlusIcon className="w-5 h-5 text-purple-400"/>
                      <span>Добавить еще</span>
                  </button>
                  <button onClick={() => onAIAssist(category)} className="flex items-center gap-x-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700/80 rounded-lg transition-colors text-slate-200 font-semibold">
                      <SmartToyIcon className="w-5 h-5 text-purple-400"/>
                      <span>AI Ассистент</span>
                  </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
              <p className="text-xl font-semibold mb-6">Список пуст</p>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button
                    onClick={onAddPhrase}
                    className="w-40 h-40 bg-slate-700/50 hover:bg-slate-700/80 rounded-2xl flex flex-col items-center justify-center transition-colors"
                >
                    <PlusIcon className="w-12 h-12 text-purple-400 mb-2"/>
                    <span className="font-semibold text-slate-200">Добавить фразу</span>
                </button>
                <button
                    onClick={() => onAIAssist(category)}
                    className="w-40 h-40 bg-slate-700/50 hover:bg-slate-700/80 rounded-2xl flex flex-col items-center justify-center transition-colors"
                >
                    <SmartToyIcon className="w-12 h-12 text-purple-400 mb-2"/>
                    <span className="font-semibold text-slate-200">AI Ассистент</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryDetailModal;