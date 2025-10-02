import React, { useState, useEffect } from 'react';
import { Category } from '../types';
import CloseIcon from './icons/CloseIcon';
import { useTranslation } from '../src/hooks/useTranslation.ts';

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (categoryData: { name: string; color: string }) => Promise<boolean>;
  initialData?: Category | null;
}

const colors = [
  'bg-slate-500', 'bg-red-500', 'bg-orange-500', 'bg-amber-500',
  'bg-yellow-500', 'bg-lime-500', 'bg-green-500', 'bg-emerald-500',
  'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-blue-500',
  'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500',
  'bg-pink-500', 'bg-rose-500'
];

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [color, setColor] = useState(colors[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setColor(initialData?.color || colors[Math.floor(Math.random() * colors.length)]);
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const success = await onSubmit({ name: name.trim(), color });
    if (!success) {
      setError(t('categories.form.errors.duplicate'));
    } else {
      setError(null);
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-[70] flex justify-center items-center backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-sm m-4"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-slate-100">{initialData ? t('categories.form.editTitle') : t('categories.form.createTitle')}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-700">
            <CloseIcon className="w-6 h-6 text-slate-400" />
          </button>
        </header>

        <div className="p-6 space-y-6">
          <div>
            <label htmlFor="category-name" className="block text-sm font-medium text-slate-300 mb-2">{t('categories.form.fields.nameLabel')}</label>
            <input
              id="category-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('categories.form.fields.namePlaceholder')}
              className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
              autoFocus
            />
            <p className="text-xs text-slate-400 mt-2">{t('categories.form.notes.aiHint')}</p>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">{t('categories.form.fields.colorLabel')}</label>
            <div className="grid grid-cols-6 gap-2">
              {colors.map(c => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-10 h-10 rounded-full ${c} transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-white' : ''}`}
                  aria-label={t('categories.form.fields.colorAria', { color: c })}
                />
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-700">
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full px-6 py-3 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors disabled:opacity-50"
          >
            {initialData ? t('categories.form.submit.save') : t('categories.form.submit.create')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CategoryFormModal;
