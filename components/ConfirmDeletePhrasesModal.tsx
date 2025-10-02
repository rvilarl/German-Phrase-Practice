
import React, { useState, useEffect } from 'react';
import { Category, Phrase } from '../types';
import FolderMinusIcon from './icons/FolderMinusIcon';
import CheckIcon from './icons/CheckIcon';
import CloseIcon from './icons/CloseIcon';
import TrashIcon from './icons/TrashIcon';
import FolderMoveIcon from './icons/FolderMoveIcon';

interface ConfirmDeletePhrasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  phrases: Phrase[];
  categories: Category[];
  sourceCategory: Category;
  onConfirmDelete: (phraseIds: string[]) => void;
  onConfirmMove: (phraseIds: string[], targetCategoryId: string) => void;
}

const ConfirmDeletePhrasesModal: React.FC<ConfirmDeletePhrasesModalProps> = ({ isOpen, onClose, phrases, categories, sourceCategory, onConfirmDelete, onConfirmMove }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetCategoryId, setTargetCategoryId] = useState('');

  const otherCategories = categories.filter(c => c.id !== sourceCategory.id);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(phrases.map(p => p.id)));
      if (otherCategories.length > 0) {
        const general = otherCategories.find(c => c.name.toLowerCase() === 'general');
        setTargetCategoryId(general ? general.id : otherCategories[0].id);
      }
    }
  }, [isOpen, phrases, sourceCategory, categories]);

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    setSelectedIds(newSelection);
  };
  
  const handleToggleAll = () => {
    if (selectedIds.size === phrases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(phrases.map(p => p.id)));
    }
  };

  const handleConfirm = () => {
    const selected = Array.from(selectedIds);
    if (selected.length === 0) return;
    onConfirmDelete(selected);
  };
  
  const handleMove = () => {
    const selected = Array.from(selectedIds);
    if (selected.length === 0 || !targetCategoryId) return;
    onConfirmMove(selected, targetCategoryId);
  };

  const allSelected = selectedIds.size === phrases.length;

  return (
    <div className="fixed inset-0 bg-black/70 z-[80] flex justify-center items-center backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-lg m-4 flex flex-col h-[90vh]" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-slate-700 space-x-3">
          <div className="flex items-center gap-x-3">
            <div className="w-10 h-10 rounded-full bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                <FolderMinusIcon className="w-5 h-5 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">Подтвердите действие</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700"><CloseIcon className="w-6 h-6 text-slate-400" /></button>
        </header>
        
        <div className="p-4 flex-grow overflow-y-auto hide-scrollbar">
            <p className="text-slate-300 mb-4">AI-ассистент предлагает удалить или переместить следующие {phrases.length} {phrases.length === 1 ? 'карточку' : 'карточки'} из категории "{sourceCategory.name}".</p>
            <div className="mb-3">
                <label onClick={handleToggleAll} className="flex items-center cursor-pointer p-2 rounded-md hover:bg-slate-700/50 w-fit">
                    <div className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border-2 ${allSelected ? 'bg-purple-600 border-purple-500' : 'bg-slate-900 border-slate-600'}`}>
                        {allSelected && <CheckIcon className="w-3 h-3 text-white" />}
                    </div>
                    <span className="ml-3 text-sm font-medium text-slate-200">{allSelected ? 'Снять выделение' : 'Выбрать все'}</span>
                </label>
            </div>
            <ul className="space-y-2">
                {phrases.map(phrase => (
                    <li key={phrase.id} onClick={() => handleToggle(phrase.id)} className={`p-3 rounded-lg flex items-start space-x-3 cursor-pointer transition-colors ${selectedIds.has(phrase.id) ? 'bg-slate-700' : 'bg-slate-700/50 hover:bg-slate-700/80'}`}>
                        <div className={`mt-1 w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border-2 ${selectedIds.has(phrase.id) ? 'bg-purple-600 border-purple-500' : 'bg-slate-900 border-slate-600'}`}>
                            {selectedIds.has(phrase.id) && <CheckIcon className="w-3 h-3 text-white" />}
                        </div>
                        <div>
                            <p className="font-medium text-slate-200">{phrase.text.learning}</p>
                            <p className="text-sm text-slate-400">{phrase.text.native}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
        
        <footer className="p-4 border-t border-slate-700 flex flex-col sm:flex-row gap-3">
          <button onClick={handleConfirm} disabled={selectedIds.size === 0} className="w-full flex-1 px-4 py-3 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <TrashIcon className="w-5 h-5"/>
            <span>Удалить ({selectedIds.size})</span>
          </button>
          {otherCategories.length > 0 && (
            <div className="w-full flex-1 flex items-center gap-2">
                <button onClick={handleMove} disabled={selectedIds.size === 0 || !targetCategoryId} className="px-4 py-3 rounded-md bg-slate-600 hover:bg-slate-700 text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    <FolderMoveIcon className="w-5 h-5"/>
                    <span>Переместить ({selectedIds.size})</span>
                </button>
                <select value={targetCategoryId} onChange={e => setTargetCategoryId(e.target.value)} disabled={selectedIds.size === 0} className="flex-grow bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50">
                    {otherCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};

export default ConfirmDeletePhrasesModal;
