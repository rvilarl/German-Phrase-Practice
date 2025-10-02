import React from 'react';
import { Category } from '../types';
import { useTranslation } from '../src/hooks/useTranslation.ts';

interface AutoFillLoadingModalProps {
  isOpen: boolean;
  category: Category | null;
}

const AutoFillLoadingModal: React.FC<AutoFillLoadingModalProps> = ({ isOpen, category }) => {
  const { t } = useTranslation();

  if (!isOpen || !category) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-[90] flex justify-center items-center backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-sm m-4 p-8 text-center">
        <h2 className="text-xl font-bold text-slate-100">{t('modals.autoFillLoading.title')}</h2>
        <p className="text-slate-400 mt-2">
          {t('modals.autoFillLoading.body', { category: category.name })}
        </p>
      </div>
    </div>
  );
};

export default AutoFillLoadingModal;
