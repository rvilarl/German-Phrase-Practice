import React from 'react';
import type { Phrase } from '../types';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import ProgressBar from './ProgressBar';
import * as srsService from '../services/srsService';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  phrase: Phrase | null;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ isOpen, onClose, onConfirm, phrase }) => {
  if (!isOpen || !phrase) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-[80] flex justify-center items-center p-4" 
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-sm m-4 p-6 text-center"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center">
            <AlertTriangleIcon className="w-6 h-6 text-red-500" />
          </div>
        </div>
        
        <h2 className="text-xl font-bold text-slate-100">Подтвердите удаление</h2>
        <p className="text-slate-400 mt-2 mb-4">Вы уверены, что хотите навсегда удалить эту фразу?</p>
        
        <div className="bg-slate-700/50 p-4 rounded-md text-center mb-4">
            <p className="text-slate-200 font-medium text-lg">"{phrase.russian}"</p>
            <p className="text-slate-400 mt-1">"{phrase.german}"</p>
        </div>

        <div className="mb-6 px-2">
            <p className="text-xs text-slate-400 mb-1 text-left">Уровень освоения:</p>
            <ProgressBar current={phrase.masteryLevel} max={srsService.MAX_MASTERY_LEVEL} />
        </div>

        <div className="flex justify-center space-x-4">
          <button 
            onClick={onClose} 
            className="px-6 py-2 rounded-md bg-slate-600 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            Отмена
          </button>
          <button 
            onClick={onConfirm} 
            className="px-6 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
