import React, { useState } from 'react';
import { Category } from '../types';
import AlertTriangleIcon from './icons/AlertTriangleIcon';

interface ConfirmDeleteCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: { migrationTargetId: string | null }) => void;
  category: Category | null;
  phraseCount: number;
  allCategories: Category[];
}

const ConfirmDeleteCategoryModal: React.FC<ConfirmDeleteCategoryModalProps> = ({ isOpen, onClose, onConfirm, category, phraseCount, allCategories }) => {
  const [action, setAction] = useState<'move' | 'delete' | ''>('');
  const [migrationTarget, setMigrationTarget] = useState('');

  if (!isOpen || !category) return null;

  const otherCategories = allCategories.filter(c => c.id !== category.id && !c.isFoundational);
  const canMove = otherCategories.length > 0;
  
  // Set initial state based on what's possible
  if (action === '' && phraseCount > 0) {
      if (canMove) setAction('move');
      else setAction('delete');
  } else if (action === '' && phraseCount === 0) {
      setAction('delete');
  }

  if(action === 'move' && canMove && !migrationTarget){
      setMigrationTarget(otherCategories[0].id)
  }

  const handleConfirm = () => {
    if (phraseCount === 0) {
        onConfirm({ migrationTargetId: null });
        return;
    }
    if (action === 'delete') {
      onConfirm({ migrationTargetId: null });
    } else if (action === 'move' && migrationTarget) {
      onConfirm({ migrationTargetId: migrationTarget });
    }
  };
  
  const isConfirmDisabled = phraseCount > 0 && action === 'move' && !migrationTarget;

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center p-4" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-sm m-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center">
            <AlertTriangleIcon className="w-6 h-6 text-red-500" />
          </div>
        </div>
        
        <h2 className="text-xl font-bold text-slate-100 text-center">Удалить категорию?</h2>
        <p className="text-slate-400 mt-2 text-center">Вы собираетесь удалить категорию:</p>
        
        <div className="bg-slate-700/50 p-3 rounded-md text-center my-4">
            <p className="text-slate-200 font-medium text-lg">{category.name}</p>
        </div>
        
        {phraseCount > 0 && (
          <div className="space-y-4 mb-6">
            <p className="text-slate-300 text-sm text-center">В этой категории находится {phraseCount} {phraseCount === 1 ? 'карточка' : (phraseCount > 1 && phraseCount < 5 ? 'карточки' : 'карточек')}. Что с ними сделать?</p>
            {canMove && (
                <div className="p-3 bg-slate-900/50 rounded-md">
                  <label className="flex items-center">
                    <input type="radio" name="deleteAction" value="move" checked={action === 'move'} onChange={() => setAction('move')} className="w-5 h-5 bg-slate-600 border-slate-500 text-purple-500 focus:ring-purple-500"/>
                    <span className="ml-3 text-slate-200">Переместить в</span>
                  </label>
                  {action === 'move' && (
                    <select
                      value={migrationTarget}
                      onChange={e => setMigrationTarget(e.target.value)}
                      className="w-full mt-2 bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {otherCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                </div>
            )}
            <div className="p-3 bg-slate-900/50 rounded-md">
              <label className="flex items-center">
                <input type="radio" name="deleteAction" value="delete" checked={action === 'delete'} onChange={() => setAction('delete')} className="w-5 h-5 bg-slate-600 border-slate-500 text-purple-500 focus:ring-purple-500" />
                <span className="ml-3 text-red-400">Удалить все карточки</span>
              </label>
            </div>
          </div>
        )}

        <div className="flex justify-center space-x-4">
          <button onClick={onClose} className="px-6 py-2 rounded-md bg-slate-600 hover:bg-slate-700 text-white font-semibold transition-colors">
            Отмена
          </button>
          <button onClick={handleConfirm} disabled={isConfirmDisabled} className="px-6 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors disabled:opacity-50">
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteCategoryModal;