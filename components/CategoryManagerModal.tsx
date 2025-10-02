import React from 'react';
import { Category } from '../types';
import CloseIcon from './icons/CloseIcon';
import FolderIcon from './icons/FolderIcon';
import PlusIcon from './icons/PlusIcon';
import PencilIcon from './icons/PencilIcon';
import TrashIcon from './icons/TrashIcon';
import { useTranslation } from '../src/hooks/useTranslation.ts';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onAddCategory: () => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (category: Category) => void;
  onViewCategory: (category: Category) => void;
}

const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({ isOpen, onClose, categories, onAddCategory, onEditCategory, onDeleteCategory, onViewCategory }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex justify-center items-center backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-md m-4 flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <FolderIcon className="w-6 h-6 text-purple-400" />
            <h2 className="text-lg font-bold text-slate-100">{t('categories.manager.title')}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700">
            <CloseIcon className="w-6 h-6 text-slate-400" />
          </button>
        </header>

        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto hide-scrollbar">
          {categories.map(category => (
            <div
              key={category.id}
              className="group flex items-center justify-between p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <button onClick={() => onViewCategory(category)} className="flex items-center flex-grow text-left">
                <span className={`w-4 h-4 rounded-full mr-3 flex-shrink-0 ${category.color}`}></span>
                <span className="text-slate-200">{category.name}</span>
              </button>
              <div className="flex items-center space-x-1 opacity-50 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEditCategory(category)} className="p-2 text-slate-400 hover:text-blue-400 rounded-full transition-colors" aria-label={t('categories.manager.aria.edit', { name: category.name })}>
                  <PencilIcon className="w-5 h-5" />
                </button>
                {category.id !== 'general' && (
                  <button onClick={() => onDeleteCategory(category)} className="p-2 text-slate-400 hover:text-red-400 rounded-full transition-colors" aria-label={t('categories.manager.aria.delete', { name: category.name })}>
                    <TrashIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-slate-700">
            <button
                onClick={onAddCategory}
                className="w-full flex items-center justify-center px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors font-semibold text-white shadow-md"
            >
                <PlusIcon className="w-5 h-5 mr-2" />
                <span>{t('categories.manager.add')}</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryManagerModal;
