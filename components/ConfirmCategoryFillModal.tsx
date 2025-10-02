import React from 'react';
import { Category } from '../types';
import SmartToyIcon from './icons/SmartToyIcon';
import { useTranslation } from '../src/hooks/useTranslation';

interface ConfirmCategoryFillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (category: Category) => void;
  category: Category | null;
}

const ConfirmCategoryFillModal: React.FC<ConfirmCategoryFillModalProps> = ({ isOpen, onClose, onConfirm, category }) => {
  const { t } = useTranslation();

  if (!isOpen || !category) return null;

  const handleConfirmClick = () => {
    onConfirm(category);
  }

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-[80] flex justify-center items-center backdrop-blur-sm p-4 animate-fade-in" 
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-sm m-4 p-6 text-center"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-purple-900/50 flex items-center justify-center">
            <SmartToyIcon className="w-6 h-6 text-purple-400" />
          </div>
        </div>
        
        <h2 className="text-xl font-bold text-slate-100">{t('modals.confirmCategoryFill.title')}</h2>
        <p className="text-slate-400 mt-2 mb-4">{t('modals.confirmCategoryFill.body', { category: category.name })}</p>

        <div className="flex justify-center space-x-4 mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-md bg-slate-600 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            {t('modals.confirmCategoryFill.actions.cancel')}
          </button>
          <button
            onClick={handleConfirmClick}
            className="px-6 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors"
          >
            {t('modals.confirmCategoryFill.actions.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmCategoryFillModal;
